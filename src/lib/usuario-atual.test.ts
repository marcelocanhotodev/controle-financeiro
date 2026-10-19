// Tarefa 2.9 — conferência da sessão no banco: sem sessão, conta inexistente
// e sessão emitida antes da redefinição de senha são recusadas; sessão
// emitida depois da redefinição é aceita.
//
// `getUsuarioAtual()` só junta `auth()` + `conferirSessao()` + redirect; a
// regra testada aqui é a de `conferirSessao()`.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// `usuario-atual.ts` importa `auth` de src/lib/auth.ts, que monta o Auth.js.
// Os testes não precisam dele.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { conferirSessao } from "@/lib/usuario-atual";

const EMAIL = "usuario-atual@caixa.test";
let usuarioId: number;

beforeAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: EMAIL } });
  usuarioId = (await prisma.usuario.create({ data: { nome: "Ana", email: EMAIL, senhaHash: "x" } })).id;
});

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { email: EMAIL } });
});

describe("conferirSessao", () => {
  it("recusa quando não há sessão ou o id é inválido", async () => {
    expect(await conferirSessao(null)).toBeNull();
    expect(await conferirSessao({})).toBeNull();
    expect(await conferirSessao({ id: "abc", emitidoEm: Date.now() })).toBeNull();
  });

  it("recusa quando a conta não existe mais", async () => {
    expect(await conferirSessao({ id: "999999999", emitidoEm: Date.now() })).toBeNull();
  });

  it("aceita sessão de conta que nunca redefiniu a senha, sem devolver o hash", async () => {
    const usuario = await conferirSessao({ id: String(usuarioId), emitidoEm: 1 });
    expect(usuario?.id).toBe(usuarioId);
    expect(usuario).not.toHaveProperty("senhaHash");
  });

  it("recusa sessão emitida antes da redefinição e aceita a emitida depois", async () => {
    const redefinidaEm = new Date();
    await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaAlteradaEm: redefinidaEm } });

    expect(await conferirSessao({ id: String(usuarioId), emitidoEm: redefinidaEm.getTime() - 1 })).toBeNull();
    expect(await conferirSessao({ id: String(usuarioId) })).toBeNull();
    expect(await conferirSessao({ id: String(usuarioId), emitidoEm: redefinidaEm.getTime() + 1 })).not.toBeNull();
  });
});
