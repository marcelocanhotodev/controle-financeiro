// Tarefas 3.2, 3.3 e 3.10 — Server Actions de grupo (spec grupos).
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT ${destino}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { criarGrupo, entrarPorCodigo, removerMembro, sairDoGrupo, trocarGrupoAtivo } from "@/lib/actions/grupo";
import { resolverGrupoAtual } from "@/lib/grupo-atual";

const DOMINIO = "@acoes-grupo.caixa.test";
const CODIGO_VIAGEM = "TVIAG-DEZ";

let anaId: number;
let viagemId: number;

function logarComo(id: number) {
  authMock.mockResolvedValue({ user: { id: String(id), emitidoEm: Date.now() } });
}

async function limpar() {
  const usuarios = await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO } }, select: { id: true } });
  const ids = usuarios.map((u) => u.id);
  const participacoes = await prisma.participacao.findMany({ where: { usuarioId: { in: ids } }, select: { grupoId: true } });
  await prisma.grupo.deleteMany({
    where: { OR: [{ id: { in: participacoes.map((p) => p.grupoId) } }, { codigo: CODIGO_VIAGEM }] },
  });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}

beforeEach(async () => {
  await limpar();
  anaId = (await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } })).id;
  viagemId = (await prisma.grupo.create({ data: { nome: "Viagem de Dezembro", codigo: CODIGO_VIAGEM } })).id;
  logarComo(anaId);
});

afterAll(limpar);

describe("criarGrupo", () => {
  it('Scenario "Criar grupo" — Administradora, grupo ativo, código gerado e aviso', async () => {
    const resultado = await criarGrupo({ nome: "  Reforma da cozinha " });
    expect(resultado).toEqual({ ok: true, mensagem: 'Grupo "Reforma da cozinha" criado.' });

    const ana = await prisma.usuario.findUniqueOrThrow({
      where: { id: anaId },
      include: { participacoes: { include: { grupo: true } } },
    });
    expect(ana.participacoes).toHaveLength(1);
    expect(ana.participacoes[0]).toMatchObject({ papel: "ADMIN", grupo: { nome: "Reforma da cozinha" } });
    expect(ana.participacoes[0].grupo.codigo).toMatch(/^REFORM-\d{4}$/);
    expect(ana.grupoAtivoId).toBe(ana.participacoes[0].grupoId);
  });

  it('Scenario "Nome em branco" — recusa sem criar grupo', async () => {
    expect(await criarGrupo({ nome: "   " })).toEqual({ ok: false, erro: "Dê um nome ao grupo." });
    expect(await prisma.participacao.count({ where: { usuarioId: anaId } })).toBe(0);
  });

  it('Scenario "Id escolhido pelo cliente" — o id enviado é ignorado', async () => {
    await criarGrupo({ nome: "Com id", id: 999_999 });
    expect(await prisma.grupo.findUnique({ where: { id: 999_999 } })).toBeNull();
  });

  it("sem sessão, leva a /login", async () => {
    authMock.mockResolvedValue(null);
    await expect(criarGrupo({ nome: "X" })).rejects.toThrow("REDIRECT /login");
  });
});

describe("entrarPorCodigo", () => {
  it('Scenario "Código válido" — entra como Membro sem diferenciar maiúsculas e o grupo vira o ativo', async () => {
    const resultado = await entrarPorCodigo({ codigo: " tviag-dez " });
    expect(resultado).toEqual({ ok: true, mensagem: 'Você entrou em "Viagem de Dezembro".' });

    const participacao = await prisma.participacao.findUniqueOrThrow({
      where: { usuarioId_grupoId: { usuarioId: anaId, grupoId: viagemId } },
    });
    expect(participacao.papel).toBe("MEMBRO");
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: anaId } })).grupoAtivoId).toBe(viagemId);
  });

  it('Scenario "Código inexistente"', async () => {
    expect(await entrarPorCodigo({ codigo: "NAOEXISTE-0000" })).toEqual({
      ok: false,
      erro: "Não encontramos nenhum grupo com este código.",
    });
  });

  it('Scenario "Já é membro"', async () => {
    await entrarPorCodigo({ codigo: CODIGO_VIAGEM });
    expect(await entrarPorCodigo({ codigo: CODIGO_VIAGEM })).toEqual({ ok: false, erro: "Você já participa deste grupo." });
  });

  it('Scenario "Compartilhar o grupo" — o id do grupo não serve como código', async () => {
    expect((await entrarPorCodigo({ codigo: String(viagemId) })).ok).toBe(false);
  });
});

describe("trocarGrupoAtivo", () => {
  it('Scenario "Trocar de grupo" — grava o grupo escolhido como ativo', async () => {
    await criarGrupo({ nome: "Finanças da Casa" });
    await entrarPorCodigo({ codigo: CODIGO_VIAGEM });
    const casaId = (await prisma.participacao.findFirstOrThrow({ where: { usuarioId: anaId, papel: "ADMIN" } })).grupoId;

    expect(await trocarGrupoAtivo(casaId)).toEqual({ ok: true });
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: anaId } })).grupoAtivoId).toBe(casaId);
  });

  it('Scenario "Escolher grupo do qual não participa" — o grupo ativo não muda e a resposta é de grupo inexistente', async () => {
    await criarGrupo({ nome: "Finanças da Casa" });
    const antes = (await prisma.usuario.findUniqueOrThrow({ where: { id: anaId } })).grupoAtivoId;

    const deOutro = await trocarGrupoAtivo(viagemId);
    const inexistente = await trocarGrupoAtivo(999_999_999);

    expect(deOutro).toEqual({ ok: false, erro: "Grupo não encontrado." });
    expect(inexistente).toEqual(deOutro);
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: anaId } })).grupoAtivoId).toBe(antes);
  });
});

describe("removerMembro e sairDoGrupo", () => {
  let pedroId: number;
  let joanaId: number;

  /** Viagem: Ana (Administradora, entrou primeiro), Pedro e Joana (Membros). */
  beforeEach(async () => {
    pedroId = (await prisma.usuario.create({ data: { nome: "Pedro", email: `pedro${DOMINIO}`, senhaHash: "x" } })).id;
    joanaId = (await prisma.usuario.create({ data: { nome: "Joana", email: `joana${DOMINIO}`, senhaHash: "x" } })).id;
    await prisma.participacao.createMany({
      data: [
        { usuarioId: anaId, grupoId: viagemId, papel: "ADMIN", entrouEm: new Date("2026-01-01") },
        { usuarioId: pedroId, grupoId: viagemId, papel: "MEMBRO", entrouEm: new Date("2026-02-01") },
        { usuarioId: joanaId, grupoId: viagemId, papel: "MEMBRO", entrouEm: new Date("2026-03-01") },
      ],
    });
    await prisma.usuario.updateMany({ where: { id: { in: [anaId, pedroId, joanaId] } }, data: { grupoAtivoId: viagemId } });
  });

  const membros = async () =>
    prisma.participacao.findMany({ where: { grupoId: viagemId }, orderBy: { usuarioId: "asc" } });

  it('Scenario "Remover com confirmação" — Pedro deixa o grupo e o acesso cai na hora', async () => {
    expect(await removerMembro(pedroId)).toEqual({ ok: true, mensagem: "Pedro saiu do grupo." });
    expect((await membros()).map((m) => m.usuarioId)).not.toContain(pedroId);
    await expect(resolverGrupoAtual({ id: String(pedroId), emitidoEm: Date.now() })).rejects.toThrow();
  });

  it('Scenario "Não remover a si mesma" e membro de outro grupo', async () => {
    expect((await removerMembro(anaId)).ok).toBe(false);
    const forasteiro = await prisma.usuario.create({ data: { nome: "Fora", email: `fora${DOMINIO}`, senhaHash: "x" } });
    expect(await removerMembro(forasteiro.id)).toEqual({ ok: false, erro: "Membro não encontrado." });
    expect(await membros()).toHaveLength(3);
  });

  it('Scenario "Membro tenta ação de Administrador" — recusada e nada muda', async () => {
    logarComo(pedroId);
    expect((await removerMembro(joanaId)).ok).toBe(false);
    expect(await membros()).toHaveLength(3);
  });

  it('Scenario "Sair com confirmação" — deixa de ser membro e vê o aviso de saída', async () => {
    logarComo(joanaId);
    expect(await sairDoGrupo()).toEqual({ ok: true, mensagem: "Você saiu do grupo." });
    expect((await membros()).map((m) => m.usuarioId)).not.toContain(joanaId);
  });

  it('Scenario "Último Administrador sai" — o membro mais antigo restante vira Administrador', async () => {
    await sairDoGrupo();
    const restantes = await membros();
    expect(restantes.find((m) => m.usuarioId === pedroId)?.papel).toBe("ADMIN");
    expect(restantes.find((m) => m.usuarioId === joanaId)?.papel).toBe("MEMBRO");
  });

  it('Scenario "Último membro sai" — o grupo e os convites são excluídos', async () => {
    await prisma.participacao.deleteMany({ where: { grupoId: viagemId, usuarioId: { in: [pedroId, joanaId] } } });
    await prisma.convite.create({
      data: { grupoId: viagemId, email: `x${DOMINIO}`, token: `tok-sair-${Date.now()}`, criadoPorId: anaId, expiraEm: new Date(Date.now() + 1e9) },
    });

    await sairDoGrupo();

    expect(await prisma.grupo.findUnique({ where: { id: viagemId } })).toBeNull();
    expect(await prisma.convite.count({ where: { grupoId: viagemId } })).toBe(0);
  });

  it('Scenario "Sair do grupo ativo" — o grupo ativo passa a ser o mais antigo que restou', async () => {
    await criarGrupo({ nome: "Finanças da Casa" });
    const casaId = (await prisma.usuario.findUniqueOrThrow({ where: { id: anaId } })).grupoAtivoId!;
    await prisma.participacao.update({
      where: { usuarioId_grupoId: { usuarioId: anaId, grupoId: casaId } },
      data: { entrouEm: new Date("2025-06-01") },
    });
    await trocarGrupoAtivo(viagemId);

    await sairDoGrupo();

    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: anaId } })).grupoAtivoId).toBe(casaId);
    const grupo = await resolverGrupoAtual({ id: String(anaId), emitidoEm: Date.now() });
    expect(grupo?.trocouDe).toBeUndefined();
  });

  it("sair do único grupo deixa a pessoa sem grupo ativo", async () => {
    logarComo(joanaId);
    await sairDoGrupo();
    expect((await prisma.usuario.findUniqueOrThrow({ where: { id: joanaId } })).grupoAtivoId).toBeNull();
  });
});
