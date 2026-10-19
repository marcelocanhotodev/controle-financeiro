// Tarefa 2.1 — `authorize()` devolve a mesma resposta para e-mail inexistente
// e para senha errada (spec autenticacao, "Login por e-mail e senha").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verificarCredenciais } from "@/lib/credenciais";

const EMAIL = "teste-credenciais@caixa.test";
const SENHA = "senha-forte-123";

describe("verificarCredenciais", () => {
  let usuarioId: number;

  beforeAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } });
    const usuario = await prisma.usuario.create({
      data: { nome: "Teste Credenciais", email: EMAIL, senhaHash: await bcrypt.hash(SENHA, 10) },
    });
    usuarioId = usuario.id;
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { email: EMAIL } });
  });

  it("devolve o usuário quando e-mail e senha conferem, com o id como string", async () => {
    const resultado = await verificarCredenciais(EMAIL, SENHA);
    expect(resultado).toEqual({ id: String(usuarioId), email: EMAIL, name: "Teste Credenciais" });
  });

  it("não diferencia maiúsculas de minúsculas no e-mail", async () => {
    const resultado = await verificarCredenciais("  Teste-Credenciais@CAIXA.test ", SENHA);
    expect(resultado?.id).toBe(String(usuarioId));
  });

  it("devolve null igual para e-mail inexistente e para senha errada", async () => {
    const emailInexistente = await verificarCredenciais("ninguem@caixa.test", SENHA);
    const senhaErrada = await verificarCredenciais(EMAIL, "senha-errada-456");
    expect(emailInexistente).toBeNull();
    expect(senhaErrada).toBeNull();
  });

  it("devolve null para credenciais ausentes ou que não são texto", async () => {
    expect(await verificarCredenciais(undefined, SENHA)).toBeNull();
    expect(await verificarCredenciais(EMAIL, "")).toBeNull();
    expect(await verificarCredenciais(EMAIL, 123)).toBeNull();
  });

  it("nunca devolve o hash da senha", async () => {
    const resultado = await verificarCredenciais(EMAIL, SENHA);
    expect(JSON.stringify(resultado)).not.toContain("$2");
  });
});
