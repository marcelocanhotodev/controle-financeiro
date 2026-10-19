// Tarefa 3.12 — isolamento entre grupos (spec grupos, Requirement
// "Identificadores numéricos sem efeito sobre o acesso"). Modelo:
// src/lib/isolamento-clinica.test.ts do matilha-app.
//
// PADRÃO DE REFERÊNCIA para `lancamentos` e `resumo-mensal`: com a sessão do
// grupo A, usar um id do grupo B tem de dar exatamente a mesma resposta de
// um id que não existe — nunca "acesso negado" (isso revelaria que o registro
// existe) nem o dado do outro grupo. E um campo `id` enviado pelo cliente é
// sempre ignorado.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT ${destino}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { criarGrupo, removerMembro, trocarGrupoAtivo } from "@/lib/actions/grupo";
import { resolverGrupoAtual } from "@/lib/grupo-atual";

const DOMINIO = "@isolamento-grupo.caixa.test";
const ID_INEXISTENTE = 2_000_000_000;

let anaId: number; // Administradora do grupo A
let brunoId: number; // membro só do grupo B
let grupoAId: number;
let grupoBId: number;

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TISOG" } } });
  const usuarios = await prisma.usuario.findMany({ where: { email: { endsWith: DOMINIO } }, select: { id: true } });
  const ids = usuarios.map((u) => u.id);
  const participacoes = await prisma.participacao.findMany({ where: { usuarioId: { in: ids } }, select: { grupoId: true } });
  await prisma.grupo.deleteMany({ where: { id: { in: participacoes.map((p) => p.grupoId) } } });
  await prisma.usuario.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(async () => {
  await limpar();
  anaId = (await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } })).id;
  brunoId = (await prisma.usuario.create({ data: { nome: "Bruno", email: `bruno${DOMINIO}`, senhaHash: "x" } })).id;
  grupoAId = (await prisma.grupo.create({ data: { nome: "Grupo A", codigo: "TISOG-000A" } })).id;
  grupoBId = (await prisma.grupo.create({ data: { nome: "Grupo B", codigo: "TISOG-000B" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: anaId, grupoId: grupoAId, papel: "ADMIN" },
      { usuarioId: brunoId, grupoId: grupoBId, papel: "ADMIN" },
    ],
  });
  await prisma.usuario.update({ where: { id: anaId }, data: { grupoAtivoId: grupoAId } });
  authMock.mockResolvedValue({ user: { id: String(anaId), emitidoEm: Date.now() } });
});

afterAll(limpar);

describe("isolamento entre grupos (sessão do grupo A)", () => {
  it('Scenario "Adivinhar o id de outro grupo" — tornar o grupo B ativo responde como grupo inexistente', async () => {
    const deOutro = await trocarGrupoAtivo(grupoBId);
    const inexistente = await trocarGrupoAtivo(ID_INEXISTENTE);
    expect(deOutro).toEqual(inexistente);
    expect(deOutro.ok).toBe(false);
    expect((await resolverGrupoAtual({ id: String(anaId), emitidoEm: Date.now() }))?.grupoId).toBe(grupoAId);
  });

  it("remover alguém do grupo B responde como membro inexistente, e Bruno continua no grupo B", async () => {
    const deOutro = await removerMembro(brunoId);
    const inexistente = await removerMembro(ID_INEXISTENTE);
    expect(deOutro).toEqual(inexistente);
    expect(deOutro.ok).toBe(false);
    expect(
      await prisma.participacao.findUnique({ where: { usuarioId_grupoId: { usuarioId: brunoId, grupoId: grupoBId } } }),
    ).not.toBeNull();
  });

  it('Scenario "Id escolhido pelo cliente" — criar grupo com `id` do grupo B não toca o grupo B', async () => {
    await criarGrupo({ nome: "Novo da Ana", id: grupoBId });
    const grupoB = await prisma.grupo.findUniqueOrThrow({ where: { id: grupoBId } });
    expect(grupoB.nome).toBe("Grupo B");
    const novo = await prisma.grupo.findFirstOrThrow({ where: { nome: "Novo da Ana", participacoes: { some: { usuarioId: anaId } } } });
    expect(novo.id).not.toBe(grupoBId);
  });
});
