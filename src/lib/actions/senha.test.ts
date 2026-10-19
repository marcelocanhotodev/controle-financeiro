// Tarefa 2.10 — `pedirRedefinicaoSenha` (spec autenticacao, Requirement
// "Recuperação de senha").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

const { enviarRedefinicaoSenhaMock } = vi.hoisted(() => ({ enviarRedefinicaoSenhaMock: vi.fn() }));
vi.mock("@/lib/email", () => ({ enviarRedefinicaoSenha: enviarRedefinicaoSenhaMock }));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { definirSenha, pedirRedefinicaoSenha } from "@/lib/actions/senha";
import { verificarCredenciais } from "@/lib/credenciais";
import { buscarTokenValido, criarTokenSenha } from "@/lib/token-senha";

const EMAIL = "ana@redefinir.caixa.test";
const MENSAGEM = "Se houver uma conta com este e-mail, enviamos um link.";
let usuarioId: number;

beforeAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: EMAIL } });
  usuarioId = (await prisma.usuario.create({ data: { nome: "Ana Lima", email: EMAIL, senhaHash: "x" } })).id;
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: EMAIL } });
});

beforeEach(async () => {
  enviarRedefinicaoSenhaMock.mockReset().mockResolvedValue(undefined);
  await prisma.tokenSenha.deleteMany({ where: { usuarioId } });
});

describe("pedirRedefinicaoSenha", () => {
  it('Scenario "Pedir link com conta existente" — envia link de 1 hora, aceita maiúsculas e mostra a mensagem neutra', async () => {
    const antes = Date.now();
    const resultado = await pedirRedefinicaoSenha({ email: "  ANA@redefinir.caixa.test " });

    expect(resultado).toEqual({ ok: true, mensagem: MENSAGEM });
    expect(enviarRedefinicaoSenhaMock).toHaveBeenCalledTimes(1);
    const { email, nome, link } = enviarRedefinicaoSenhaMock.mock.calls[0][0];
    expect(email).toBe(EMAIL);
    expect(nome).toBe("Ana Lima");
    expect(link).toMatch(/\/definir-senha\/[0-9a-f]{64}$/);

    const token = await buscarTokenValido(link.split("/").pop());
    expect(token).toMatchObject({ finalidade: "REDEFINIR", usuarioId });
    const validade = token!.expiraEm.getTime() - antes;
    expect(validade).toBeGreaterThan(59 * 60 * 1000);
    expect(validade).toBeLessThanOrEqual(60 * 60 * 1000 + 5_000);
  });

  it('Scenario "Pedir link sem conta" — nada é enviado e a mensagem é a mesma', async () => {
    const resultado = await pedirRedefinicaoSenha({ email: "ninguem@redefinir.caixa.test" });
    expect(resultado).toEqual({ ok: true, mensagem: MENSAGEM });
    expect(enviarRedefinicaoSenhaMock).not.toHaveBeenCalled();
  });

  it('Scenario "Pedidos seguidos" — um segundo pedido em menos de 60 s não envia outro e-mail', async () => {
    await pedirRedefinicaoSenha({ email: EMAIL });
    const segundo = await pedirRedefinicaoSenha({ email: EMAIL });

    expect(segundo).toEqual({ ok: true, mensagem: MENSAGEM });
    expect(enviarRedefinicaoSenhaMock).toHaveBeenCalledTimes(1);
    expect(await prisma.tokenSenha.count({ where: { usuarioId } })).toBe(1);
  });

  it("falha no envio não muda a resposta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    enviarRedefinicaoSenhaMock.mockRejectedValueOnce(new Error("SMTP fora do ar"));
    expect(await pedirRedefinicaoSenha({ email: EMAIL })).toEqual({ ok: true, mensagem: MENSAGEM });
  });

  it("e-mail sem formato válido é recusado", async () => {
    expect(await pedirRedefinicaoSenha({ email: "nao-e-email" })).toEqual({ ok: false, erro: "Informe um e-mail válido." });
  });
});

describe("definirSenha (REDEFINIR)", () => {
  const novoLink = (expiraEm = new Date(Date.now() + 60 * 60 * 1000)) =>
    criarTokenSenha({ finalidade: "REDEFINIR", email: EMAIL, usuarioId, expiraEm });

  beforeEach(async () => {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: await bcrypt.hash("senha-antiga-123", 4), senhaAlteradaEm: null },
    });
  });

  it('Scenario "Redefinir a senha pelo link" — nova senha vale, antiga não, outros links caem e senhaAlteradaEm é gravado', async () => {
    const outro = await novoLink();
    const valor = await novoLink();
    const antes = Date.now();

    const resultado = await definirSenha(valor, { senha: "senha-nova-456" });

    expect(resultado).toEqual({ ok: true, email: EMAIL });
    expect(await verificarCredenciais(EMAIL, "senha-nova-456")).not.toBeNull();
    expect(await verificarCredenciais(EMAIL, "senha-antiga-123")).toBeNull();
    expect(await buscarTokenValido(outro)).toBeNull();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(usuario.senhaAlteradaEm!.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it('Scenario "Nova senha curta" — recusa e a senha não muda', async () => {
    const valor = await novoLink();
    const resultado = await definirSenha(valor, { senha: "1234567" });

    expect(resultado).toEqual({ ok: false, erro: "A senha precisa ter pelo menos 8 caracteres." });
    expect(await verificarCredenciais(EMAIL, "senha-antiga-123")).not.toBeNull();
    expect(await buscarTokenValido(valor)).not.toBeNull();
  });

  it('Scenario "Link usado, expirado ou inexistente" — nenhuma senha é definida', async () => {
    const usado = await novoLink();
    await definirSenha(usado, { senha: "primeira-troca-1" });
    const vencido = await novoLink(new Date(Date.now() - 1));

    for (const valor of [usado, vencido, "f".repeat(64), ""]) {
      expect(await definirSenha(valor, { senha: "outra-senha-789" })).toEqual({
        ok: false,
        linkInvalido: true,
        erro: "Este link não é mais válido.",
      });
    }
    expect(await verificarCredenciais(EMAIL, "outra-senha-789")).toBeNull();
  });
});

describe("definirSenha (CRIAR, convite para quem não tem conta)", () => {
  const EMAIL_JOANA = "joana@redefinir.caixa.test";
  const CODIGO = "TCRIAR-0001";
  let grupoId: number;
  let conviteId: number;
  let tokenConvite: string;

  async function limparConvite() {
    await prisma.grupo.deleteMany({ where: { codigo: CODIGO } });
    await prisma.usuario.deleteMany({ where: { email: { in: [EMAIL_JOANA, "outra@redefinir.caixa.test"] } } });
  }

  beforeEach(async () => {
    await limparConvite();
    grupoId = (await prisma.grupo.create({ data: { nome: "Finanças da Casa", codigo: CODIGO } })).id;
    tokenConvite = `tok-criar-${Date.now()}`;
    conviteId = (
      await prisma.convite.create({
        data: {
          grupoId,
          email: EMAIL_JOANA,
          token: tokenConvite,
          criadoPorId: usuarioId,
          expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    ).id;
  });

  afterAll(limparConvite);

  const linkCriar = () =>
    criarTokenSenha({
      finalidade: "CRIAR",
      email: EMAIL_JOANA,
      conviteId,
      expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

  it('Scenario "Aceitar sem conta" — cria a conta com o e-mail do convite, Membro, grupo ativo, sem "Grupo de Joana"', async () => {
    const valor = await linkCriar();
    const resultado = await definirSenha(valor, { nome: "Joana Reis", senha: "senha-da-joana" });

    expect(resultado).toEqual({ ok: true, email: EMAIL_JOANA });
    const joana = await prisma.usuario.findUniqueOrThrow({
      where: { email: EMAIL_JOANA },
      include: { participacoes: true },
    });
    expect(joana.nome).toBe("Joana Reis");
    expect(joana.participacoes).toEqual([expect.objectContaining({ grupoId, papel: "MEMBRO" })]);
    expect(joana.grupoAtivoId).toBe(grupoId);
    expect(await verificarCredenciais(EMAIL_JOANA, "senha-da-joana")).not.toBeNull();
    expect((await prisma.convite.findUniqueOrThrow({ where: { id: conviteId } })).aceitoEm).not.toBeNull();
    expect(await buscarTokenValido(valor)).toBeNull();
  });

  it('Scenario "E-mail do convite não pode ser trocado" — o e-mail enviado pelo cliente é ignorado', async () => {
    const valor = await linkCriar();
    await definirSenha(valor, { nome: "Joana", senha: "senha-da-joana", email: "outra@redefinir.caixa.test" });

    expect(await prisma.usuario.findUnique({ where: { email: "outra@redefinir.caixa.test" } })).toBeNull();
    expect(await prisma.usuario.findUnique({ where: { email: EMAIL_JOANA } })).not.toBeNull();
  });

  it('Scenario "Conta criada antes de usar o link" — orienta a entrar e aceitar pelo convite', async () => {
    const valor = await linkCriar();
    await prisma.usuario.create({ data: { nome: "Joana", email: EMAIL_JOANA, senhaHash: "x" } });

    const resultado = await definirSenha(valor, { nome: "Joana", senha: "senha-da-joana" });

    expect(resultado).toEqual({
      ok: false,
      erro: "Este e-mail já tem conta. Entre para aceitar o convite.",
      entrarPara: `/convite/${tokenConvite}`,
    });
    expect(await buscarTokenValido(valor)).not.toBeNull();
  });

  it("convite cancelado: o link de definir senha não vale mais", async () => {
    const valor = await linkCriar();
    await prisma.convite.delete({ where: { id: conviteId } });

    expect(await definirSenha(valor, { nome: "Joana", senha: "senha-da-joana" })).toMatchObject({ linkInvalido: true });
    expect(await prisma.usuario.findUnique({ where: { email: EMAIL_JOANA } })).toBeNull();
  });

  it("nome em branco ou senha curta: recusa no campo certo, sem criar conta", async () => {
    const valor = await linkCriar();
    expect(await definirSenha(valor, { nome: " ", senha: "senha-da-joana" })).toEqual({
      ok: false,
      erro: "Informe seu nome.",
      campo: "nome",
    });
    expect(await definirSenha(valor, { nome: "Joana", senha: "curta" })).toEqual({
      ok: false,
      erro: "A senha precisa ter pelo menos 8 caracteres.",
      campo: "senha",
    });
    expect(await prisma.usuario.findUnique({ where: { email: EMAIL_JOANA } })).toBeNull();
  });
});
