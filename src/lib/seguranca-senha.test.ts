// Tarefa 2.7 — spec autenticacao, Requirement "Armazenamento seguro de
// senha": só o hash bcrypt fica no banco, e nem a sessão nem os retornos das
// actions trazem o hash.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { cadastrar } from "@/lib/actions/cadastro";
import { authConfig } from "@/lib/auth.config";
import { verificarCredenciais } from "@/lib/credenciais";
import { montarTokenSessao } from "@/lib/sessao-token";

const EMAIL = "seguranca-senha@caixa.test";
const SENHA = "senha-forte-123";

let retornoCadastro: unknown;
let usuarioId: number;

async function limpar() {
  const usuario = await prisma.usuario.findUnique({ where: { email: EMAIL }, include: { participacoes: true } });
  if (!usuario) return;
  await prisma.grupo.deleteMany({ where: { id: { in: usuario.participacoes.map((p) => p.grupoId) } } });
  await prisma.usuario.delete({ where: { id: usuario.id } });
}

beforeAll(async () => {
  await limpar();
  retornoCadastro = await cadastrar({ nome: "Teste Segurança", email: EMAIL, senha: SENHA });
  usuarioId = (await prisma.usuario.findUniqueOrThrow({ where: { email: EMAIL } })).id;
});

afterAll(limpar);

describe("armazenamento seguro de senha", () => {
  it('Scenario "Senha nunca em texto" — nenhuma linha das tabelas da conta contém a senha', async () => {
    const linhas = await prisma.$queryRaw<{ linha: string }[]>`
      SELECT row_to_json(u)::text AS linha FROM usuarios u WHERE u.id = ${usuarioId}
      UNION ALL
      SELECT row_to_json(p)::text FROM participacoes p WHERE p."usuarioId" = ${usuarioId}
      UNION ALL
      SELECT row_to_json(g)::text FROM grupos g
        WHERE g.id IN (SELECT "grupoId" FROM participacoes WHERE "usuarioId" = ${usuarioId})
    `;
    expect(linhas.length).toBeGreaterThanOrEqual(3);
    for (const { linha } of linhas) expect(linha).not.toContain(SENHA);
  });

  it("o registro guarda apenas o hash bcrypt", async () => {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(usuario.senhaHash.startsWith("$2")).toBe(true);
    expect(usuario.senhaHash).not.toBe(SENHA);
  });

  it('Scenario "Hash fora das respostas" — retorno do cadastro, do authorize, do token e da sessão', async () => {
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    const autenticado = await verificarCredenciais(EMAIL, SENHA);
    const token = montarTokenSessao({}, autenticado ?? undefined);
    const sessao = await authConfig.callbacks!.session!({
      session: { user: { id: "", email: "" }, expires: "" } as Session,
      token,
    } as Parameters<NonNullable<NonNullable<typeof authConfig.callbacks>["session"]>>[0]);

    for (const resposta of [retornoCadastro, autenticado, token, sessao]) {
      const texto = JSON.stringify(resposta);
      expect(texto).not.toContain(usuario.senhaHash);
      expect(texto).not.toContain("senhaHash");
      expect(texto).not.toContain(SENHA);
    }
  });
});
