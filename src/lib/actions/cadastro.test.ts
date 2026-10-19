// Tarefa 2.4 — Server Action `cadastrar` (spec autenticacao, Requirements
// "Cadastro de conta", "Identificador da conta" e "Entrada em grupo durante o
// cadastro").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { cadastrar } from "@/lib/actions/cadastro";

const DOMINIO = "@cadastro.caixa.test";
const CODIGO_CASA = "TCASA-2026";

let grupoCasaId: number;
let adminCasaId: number;

beforeAll(async () => {
  await limpar();
  const admin = await prisma.usuario.create({
    data: { nome: "Admin Casa", email: `admin${DOMINIO}`, senhaHash: "x" },
  });
  adminCasaId = admin.id;
  const grupo = await prisma.grupo.create({ data: { nome: "Finanças da Casa (teste)", codigo: CODIGO_CASA } });
  grupoCasaId = grupo.id;
  await prisma.participacao.create({ data: { usuarioId: admin.id, grupoId: grupo.id, papel: "ADMIN" } });
});

afterAll(limpar);

async function limpar() {
  const usuarios = await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO } }, select: { id: true } });
  const ids = usuarios.map((u) => u.id);
  const participacoes = await prisma.participacao.findMany({ where: { usuarioId: { in: ids } }, select: { grupoId: true } });
  await prisma.convite.deleteMany({ where: { criadoPorId: { in: ids } } });
  await prisma.grupo.deleteMany({
    where: { OR: [{ id: { in: participacoes.map((p) => p.grupoId) } }, { codigo: CODIGO_CASA }] },
  });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}

function dados(email: string, extra: Record<string, unknown> = {}) {
  return { nome: "Marcelo Souza", email, senha: "senha-forte-123", codigoGrupo: "", ...extra };
}

describe("cadastrar", () => {
  it('Scenario "Cadastro sem código" — cria "Grupo de Marcelo" com a pessoa Administradora e grupo ativo', async () => {
    const resultado = await cadastrar(dados(`marcelo${DOMINIO}`));
    expect(resultado).toEqual({ ok: true });

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { email: `marcelo${DOMINIO}` },
      include: { participacoes: { include: { grupo: true } } },
    });
    expect(Number.isInteger(usuario.id)).toBe(true);
    expect(usuario.participacoes).toHaveLength(1);
    expect(usuario.participacoes[0].papel).toBe("ADMIN");
    expect(usuario.participacoes[0].grupo.nome).toBe("Grupo de Marcelo");
    expect(usuario.participacoes[0].grupo.codigo).toMatch(/^GRUPOD-\d{4}$/);
    expect(usuario.grupoAtivoId).toBe(usuario.participacoes[0].grupoId);
  });

  it('Scenario "Conta criada recebe id do banco" — e-mail guardado em minúsculas', async () => {
    await cadastrar(dados(`Mixed.Case${DOMINIO.toUpperCase()}`));
    const usuario = await prisma.usuario.findUnique({ where: { email: `mixed.case${DOMINIO}` } });
    expect(usuario).not.toBeNull();
  });

  it('Scenario "Cadastro com código válido" — entra como Membro, sem diferenciar maiúsculas no código', async () => {
    const resultado = await cadastrar(dados(`ana${DOMINIO}`, { nome: "Ana", codigoGrupo: " tcasa-2026 " }));
    expect(resultado.ok).toBe(true);

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { email: `ana${DOMINIO}` },
      include: { participacoes: true },
    });
    expect(usuario.participacoes).toEqual([expect.objectContaining({ grupoId: grupoCasaId, papel: "MEMBRO" })]);
    expect(usuario.grupoAtivoId).toBe(grupoCasaId);
    expect(
      await prisma.grupo.count({ where: { nome: "Grupo de Ana", participacoes: { some: { usuarioId: usuario.id } } } }),
    ).toBe(0);
  });

  it('Scenario "Código inexistente" — recusa e não deixa conta nem grupo', async () => {
    const gruposAntes = await prisma.grupo.count();
    const resultado = await cadastrar(dados(`semgrupo${DOMINIO}`, { codigoGrupo: "NAOEXISTE-0000" }));

    expect(resultado).toEqual({ ok: false, erro: "Não encontramos nenhum grupo com este código.", campo: "codigoGrupo" });
    expect(await prisma.usuario.findUnique({ where: { email: `semgrupo${DOMINIO}` } })).toBeNull();
    expect(await prisma.grupo.count()).toBe(gruposAntes);
  });

  it('Scenario "E-mail já cadastrado" — recusa com maiúsculas diferentes e orienta a entrar', async () => {
    await cadastrar(dados(`repetido${DOMINIO}`));
    const resultado = await cadastrar(dados(`REPETIDO${DOMINIO}`));
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toContain("Entrar");
    expect(resultado.campo).toBe("email");
    expect(await prisma.usuario.count({ where: { email: `repetido${DOMINIO}` } })).toBe(1);
  });

  it.each([
    ["nome", { nome: "   " }, "Informe seu nome."],
    ["email", { email: "nao-e-email" }, "Informe um e-mail válido."],
    ["senha", { senha: "1234567" }, "A senha precisa ter pelo menos 8 caracteres."],
  ])("recusa %s inválido com a mensagem da spec e não cria conta", async (campo, extra, mensagem) => {
    const email = `invalido-${campo}${DOMINIO}`;
    const resultado = await cadastrar(dados(email, extra));
    expect(resultado).toEqual({ ok: false, erro: mensagem, campo });
    expect(await prisma.usuario.findUnique({ where: { email } })).toBeNull();
  });

  it('Scenario "Cadastro não procura convites pelo e-mail" — convite pendente continua pendente', async () => {
    const email = `pedro${DOMINIO}`;
    const convite = await prisma.convite.create({
      data: {
        grupoId: grupoCasaId,
        email,
        token: `token-teste-cadastro-${Date.now()}`,
        criadoPorId: adminCasaId,
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await cadastrar(dados(email, { nome: "Pedro" }));

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email }, include: { participacoes: true } });
    expect(usuario.participacoes.some((p) => p.grupoId === grupoCasaId)).toBe(false);
    expect((await prisma.convite.findUniqueOrThrow({ where: { id: convite.id } })).aceitoEm).toBeNull();
  });

  it("ignora um campo id enviado pelo cliente", async () => {
    const email = `comid${DOMINIO}`;
    await cadastrar({ ...dados(email), id: 999_999 });
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    expect(usuario.id).not.toBe(999_999);
  });
});
