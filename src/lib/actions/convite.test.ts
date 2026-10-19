// Tarefas 3.6 e 3.7 — Server Actions de convite (spec grupos, Requirements
// "Convite por e-mail", "Aceite de convite" e "Gestão de convites
// pendentes").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

const { authMock, enviarConviteMock } = vi.hoisted(() => ({ authMock: vi.fn(), enviarConviteMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/email", () => ({ enviarConvite: enviarConviteMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT ${destino}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { aceitarConvite, cancelarConvite, convidar, reenviarConvite } from "@/lib/actions/convite";
import { buscarTokenValido } from "@/lib/token-senha";

const DOMINIO = "@acoes-convite.caixa.test";
const CODIGO = "TCONV-0001";
const DIA = 24 * 60 * 60 * 1000;

let marceloId: number;
let anaId: number;
let casaId: number;

function logarComo(id: number) {
  authMock.mockResolvedValue({ user: { id: String(id), emitidoEm: Date.now() } });
}

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TCONV" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

beforeEach(async () => {
  await limpar();
  enviarConviteMock.mockReset().mockResolvedValue(undefined);
  marceloId = (await prisma.usuario.create({ data: { nome: "Marcelo", email: `marcelo${DOMINIO}`, senhaHash: "x" } })).id;
  anaId = (await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } })).id;
  casaId = (await prisma.grupo.create({ data: { nome: "Finanças da Casa", codigo: CODIGO } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: marceloId, grupoId: casaId, papel: "ADMIN" },
      { usuarioId: anaId, grupoId: casaId, papel: "MEMBRO" },
    ],
  });
  await prisma.usuario.updateMany({ where: { id: { in: [marceloId, anaId] } }, data: { grupoAtivoId: casaId } });
  logarComo(marceloId);
});

afterAll(limpar);

const ultimoEnvio = () => enviarConviteMock.mock.calls.at(-1)![0];

describe("convidar", () => {
  it('Scenario "Convidar um e-mail" — convite pendente de 7 dias, e-mail com grupo, quem convidou e link', async () => {
    const antes = Date.now();
    const resultado = await convidar({ email: " Pedro@acoes-convite.caixa.test " });

    expect(resultado).toEqual({ ok: true, mensagem: `Convite enviado para pedro${DOMINIO}.` });
    const convite = await prisma.convite.findFirstOrThrow({ where: { grupoId: casaId, email: `pedro${DOMINIO}` } });
    expect(convite.aceitoEm).toBeNull();
    expect(convite.envioStatus).toBe("ENVIADO");
    expect(convite.expiraEm.getTime() - antes).toBeGreaterThanOrEqual(7 * DIA - 5_000);
    expect(ultimoEnvio()).toMatchObject({ grupoNome: "Finanças da Casa", convidadoPor: "Marcelo", replyTo: `marcelo${DOMINIO}` });
    // Pedro só participa depois de aceitar.
    expect(await prisma.participacao.count({ where: { grupoId: casaId, usuario: { email: `pedro${DOMINIO}` } } })).toBe(0);
  });

  it('Scenario "Administrador não define senha" — nenhuma conta é criada no convite', async () => {
    await convidar({ email: `joana${DOMINIO}`, senha: "qualquer-senha", nome: "Joana" });
    expect(await prisma.usuario.findUnique({ where: { email: `joana${DOMINIO}` } })).toBeNull();
  });

  it('Scenario "Link conforme a pessoa tenha conta" e "Mesma resposta com ou sem conta"', async () => {
    const comConta = await prisma.usuario.create({ data: { nome: "Pedro", email: `pedro${DOMINIO}`, senhaHash: "x" } });

    const respostaComConta = await convidar({ email: comConta.email });
    const linkComConta = ultimoEnvio();
    const respostaSemConta = await convidar({ email: `joana${DOMINIO}` });
    const linkSemConta = ultimoEnvio();

    expect(respostaComConta.mensagem!.replace(comConta.email, "X")).toBe(respostaSemConta.mensagem!.replace(`joana${DOMINIO}`, "X"));
    expect(linkComConta).toMatchObject({ criarConta: false });
    expect(linkComConta.link).toMatch(/\/convite\/[0-9a-f]{64}$/);
    expect(linkSemConta).toMatchObject({ criarConta: true });
    expect(linkSemConta.link).toMatch(/\/definir-senha\/[0-9a-f]{64}$/);

    const token = await buscarTokenValido(linkSemConta.link.split("/").pop());
    const convite = await prisma.convite.findFirstOrThrow({ where: { email: `joana${DOMINIO}` } });
    expect(token).toMatchObject({ finalidade: "CRIAR", conviteId: convite.id, email: `joana${DOMINIO}` });
    expect(token!.expiraEm.getTime()).toBe(convite.expiraEm.getTime());
  });

  it('Scenario "E-mail inválido"', async () => {
    expect(await convidar({ email: "nao-e-email" })).toEqual({ ok: false, erro: "Informe um e-mail válido." });
  });

  it('Scenario "Já é membro"', async () => {
    expect(await convidar({ email: `ANA${DOMINIO}` })).toEqual({ ok: false, erro: "Esta pessoa já faz parte do grupo." });
  });

  it('Scenario "Convite pendente repetido" — reaproveita o convite, renova a validade e invalida o link anterior', async () => {
    await convidar({ email: `joana${DOMINIO}` });
    const primeiroLink = ultimoEnvio().link;
    await prisma.convite.updateMany({ where: { email: `joana${DOMINIO}` }, data: { expiraEm: new Date(Date.now() + DIA) } });

    const resultado = await convidar({ email: `joana${DOMINIO}` });

    expect(resultado).toEqual({ ok: true, mensagem: `Convite reenviado para joana${DOMINIO}.` });
    const convites = await prisma.convite.findMany({ where: { email: `joana${DOMINIO}` } });
    expect(convites).toHaveLength(1);
    expect(convites[0].expiraEm.getTime() - Date.now()).toBeGreaterThan(6 * DIA);
    expect(await buscarTokenValido(primeiroLink.split("/").pop())).toBeNull();
    expect(await buscarTokenValido(ultimoEnvio().link.split("/").pop())).not.toBeNull();
  });

  it('Scenario "Falha no envio do e-mail" — convite continua pendente, com FALHOU', async () => {
    enviarConviteMock.mockRejectedValueOnce(new Error("Connection timeout"));
    const resultado = await convidar({ email: `joana${DOMINIO}` });

    expect(resultado).toMatchObject({ ok: true, envioFalhou: true });
    expect(resultado.mensagem).toContain("reenviar pela lista de membros");
    const convite = await prisma.convite.findFirstOrThrow({ where: { email: `joana${DOMINIO}` } });
    expect(convite).toMatchObject({ aceitoEm: null, envioStatus: "FALHOU", envioErro: "Connection timeout" });
  });

  it('Scenario "Membro tenta ação de Administrador" — recusado e nada é criado', async () => {
    logarComo(anaId);
    const resultado = await convidar({ email: `joana${DOMINIO}` });
    expect(resultado.ok).toBe(false);
    expect(await prisma.convite.count({ where: { grupoId: casaId } })).toBe(0);
    expect(enviarConviteMock).not.toHaveBeenCalled();
  });
});

describe("reenviarConvite e cancelarConvite", () => {
  async function conviteDaJoana() {
    await convidar({ email: `joana${DOMINIO}` });
    return prisma.convite.findFirstOrThrow({ where: { email: `joana${DOMINIO}` } });
  }

  it('Scenario "Reenviar" — envia de novo, validade volta a 7 dias e o link anterior de definir senha cai', async () => {
    const convite = await conviteDaJoana();
    const linkAnterior = ultimoEnvio().link;
    await prisma.convite.update({ where: { id: convite.id }, data: { expiraEm: new Date(Date.now() + DIA) } });

    expect(await reenviarConvite(convite.id)).toEqual({ ok: true, mensagem: `Convite reenviado para joana${DOMINIO}.` });
    expect(enviarConviteMock).toHaveBeenCalledTimes(2);
    const renovado = await prisma.convite.findUniqueOrThrow({ where: { id: convite.id } });
    expect(renovado.expiraEm.getTime() - Date.now()).toBeGreaterThan(6 * DIA);
    expect(await buscarTokenValido(linkAnterior.split("/").pop())).toBeNull();
  });

  it('Scenario "Cancelar" — o convite sai e o link de definir senha deixa de funcionar', async () => {
    const convite = await conviteDaJoana();
    const link = ultimoEnvio().link;

    expect(await cancelarConvite(convite.id)).toEqual({ ok: true, mensagem: "Convite cancelado." });
    expect(await prisma.convite.findUnique({ where: { id: convite.id } })).toBeNull();
    expect(await buscarTokenValido(link.split("/").pop())).toBeNull();
  });

  it("Membro comum não reenvia nem cancela", async () => {
    const convite = await conviteDaJoana();
    logarComo(anaId);
    expect((await reenviarConvite(convite.id)).ok).toBe(false);
    expect((await cancelarConvite(convite.id)).ok).toBe(false);
    expect(await prisma.convite.findUnique({ where: { id: convite.id } })).not.toBeNull();
  });
});

describe("aceitarConvite", () => {
  let pedroId: number;

  beforeEach(async () => {
    pedroId = (await prisma.usuario.create({ data: { nome: "Pedro", email: `pedro${DOMINIO}`, senhaHash: "x" } })).id;
  });

  async function conviteDoPedro() {
    await convidar({ email: `pedro${DOMINIO}` });
    return prisma.convite.findFirstOrThrow({ where: { email: `pedro${DOMINIO}` } });
  }

  it('Scenario "Aceitar já autenticado com o mesmo e-mail" — vira Membro, grupo ativo e convite não fica pendente', async () => {
    const convite = await conviteDoPedro();
    logarComo(pedroId);

    expect(await aceitarConvite(convite.token)).toEqual({ ok: true, mensagem: 'Você entrou em "Finanças da Casa".' });

    const participacao = await prisma.participacao.findUniqueOrThrow({
      where: { usuarioId_grupoId: { usuarioId: pedroId, grupoId: casaId } },
    });
    expect(participacao.papel).toBe("MEMBRO");
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: pedroId } })).grupoAtivoId).toBe(casaId);
    expect((await prisma.convite.findUniqueOrThrow({ where: { id: convite.id } })).aceitoEm).not.toBeNull();
  });

  it('Scenario "Autenticado com outro e-mail" — recusa e Ana não entra no grupo do convite', async () => {
    const convite = await conviteDoPedro();
    const outroGrupo = await prisma.grupo.create({ data: { nome: "Outro", codigo: "TCONV-0002" } });
    await prisma.convite.update({ where: { id: convite.id }, data: { grupoId: outroGrupo.id } });
    logarComo(anaId);

    expect(await aceitarConvite(convite.token)).toEqual({ ok: false, erro: "Este convite é para outro e-mail." });
    expect(await prisma.participacao.count({ where: { grupoId: outroGrupo.id } })).toBe(0);
  });

  it('Scenario "Convite expirado, aceito ou inexistente" (e cancelado) — ninguém entra', async () => {
    const mensagem = "Este convite não é mais válido. Peça um novo convite a quem administra o grupo.";
    const convite = await conviteDoPedro();
    logarComo(pedroId);

    await prisma.convite.update({ where: { id: convite.id }, data: { expiraEm: new Date(Date.now() - 1) } });
    expect(await aceitarConvite(convite.token)).toEqual({ ok: false, erro: mensagem });

    await prisma.convite.update({ where: { id: convite.id }, data: { expiraEm: new Date(Date.now() + DIA), aceitoEm: new Date() } });
    expect(await aceitarConvite(convite.token)).toEqual({ ok: false, erro: mensagem });

    await prisma.convite.delete({ where: { id: convite.id } });
    expect(await aceitarConvite(convite.token)).toEqual({ ok: false, erro: mensagem });
    expect(await aceitarConvite("token-que-nao-existe")).toEqual({ ok: false, erro: mensagem });

    expect(await prisma.participacao.count({ where: { usuarioId: pedroId } })).toBe(0);
  });

  it('Scenario "Já participa do grupo"', async () => {
    const convite = await conviteDoPedro();
    await prisma.participacao.create({ data: { usuarioId: pedroId, grupoId: casaId, papel: "MEMBRO" } });
    logarComo(pedroId);
    expect(await aceitarConvite(convite.token)).toEqual({ ok: false, erro: "Você já participa deste grupo." });
  });

  it("sem sessão, leva a /login", async () => {
    const convite = await conviteDoPedro();
    authMock.mockResolvedValue(null);
    await expect(aceitarConvite(convite.token)).rejects.toThrow("REDIRECT /login");
  });
});
