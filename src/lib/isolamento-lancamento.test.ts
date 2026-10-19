// Tarefa 5.1 — isolamento de lançamentos entre grupos (spec lancamentos,
// Requirements "Isolamento entre grupos" e "Lançamentos do grupo excluído").
// Mesmo padrão de src/lib/isolamento-grupo.test.ts: com a sessão do grupo A,
// um id do grupo B responde exatamente como um id que não existe.
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

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { criarLancamento, excluirLancamento, restaurarLancamento } from "@/lib/actions/lancamento";
import { sairDoGrupo } from "@/lib/actions/grupo";
import { listarLancamentos, resolverFiltros } from "@/lib/lancamentos";

const DOMINIO = "@isolamento-lancamento.caixa.test";
const ID_INEXISTENTE = 2_000_000_000;

let anaId: number; // só do grupo A
let brunoId: number; // só do grupo B
let grupoAId: number;
let grupoBId: number;
const idsDoGrupoB: number[] = [];

function logarComo(id: number) {
  authMock.mockResolvedValue({ user: { id: String(id), emitidoEm: Date.now() } });
}

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TISOL" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

beforeAll(async () => {
  await limpar();
  anaId = (await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } })).id;
  brunoId = (await prisma.usuario.create({ data: { nome: "Bruno", email: `bruno${DOMINIO}`, senhaHash: "x" } })).id;
  grupoAId = (await prisma.grupo.create({ data: { nome: "Grupo A", codigo: "TISOL-000A" } })).id;
  grupoBId = (await prisma.grupo.create({ data: { nome: "Viagem de Dezembro", codigo: "TISOL-000B" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: anaId, grupoId: grupoAId, papel: "ADMIN" },
      { usuarioId: brunoId, grupoId: grupoBId, papel: "ADMIN" },
    ],
  });
  await prisma.usuario.update({ where: { id: anaId }, data: { grupoAtivoId: grupoAId } });
  await prisma.usuario.update({ where: { id: brunoId }, data: { grupoAtivoId: grupoBId } });

  for (const [descricao, excluidoEm] of [
    ["Hotel", null],
    ["Passagem", new Date()],
    ["Jantar", null],
  ] as const) {
    const lancamento = await prisma.lancamento.create({
      data: {
        grupoId: grupoBId,
        autorId: brunoId,
        tipo: "SAIDA",
        descricao,
        valor: new Prisma.Decimal("100"),
        categoria: "Viagem",
        data: new Date("2026-10-10T00:00:00Z"),
        excluidoEm,
      },
    });
    idsDoGrupoB.push(lancamento.id);
  }
  logarComo(anaId);
});

afterAll(limpar);

describe("isolamento de lançamentos (sessão do grupo A)", () => {
  it('Scenario "Acesso a grupo alheio" — a lista do grupo A não mostra nada do grupo B, nem pelo filtro de autor', async () => {
    const filtros = await resolverFiltros(grupoAId, { mes: "2026-10", autor: String(brunoId) });
    expect(filtros.autorId).toBeNull();
    const lista = await listarLancamentos(grupoAId, filtros);
    expect(lista.linhas).toEqual([]);
    expect(lista).toMatchObject({ totalEntradas: "0.00", totalSaidas: "0.00" });
  });

  it("criar com o id do grupo B grava no grupo A", async () => {
    await criarLancamento({
      tipo: "SAIDA",
      descricao: "Da Ana",
      valor: "10",
      categoria: "Outros",
      data: "2026-10-11",
      grupoId: grupoBId,
    });
    expect(await prisma.lancamento.count({ where: { grupoId: grupoBId, descricao: "Da Ana" } })).toBe(0);
    expect(await prisma.lancamento.count({ where: { grupoId: grupoAId, descricao: "Da Ana" } })).toBe(1);
  });

  it('Scenario "Percorrer ids de lançamento" — excluir e restaurar ids do grupo B respondem igual a id inexistente e nada muda', async () => {
    const antes = await prisma.lancamento.findMany({ where: { grupoId: grupoBId }, orderBy: { id: "asc" } });
    const inexistenteExcluir = await excluirLancamento(ID_INEXISTENTE);
    const inexistenteRestaurar = await restaurarLancamento(ID_INEXISTENTE);

    const primeiro = Math.min(...idsDoGrupoB);
    for (let id = primeiro; id <= Math.max(...idsDoGrupoB); id++) {
      expect(await excluirLancamento(id)).toEqual(inexistenteExcluir);
      expect(await restaurarLancamento(id)).toEqual(inexistenteRestaurar);
    }
    expect(await prisma.lancamento.findMany({ where: { grupoId: grupoBId }, orderBy: { id: "asc" } })).toEqual(antes);
  });

  it('Scenario "Acesso cortado ao sair do grupo" — Bruno removido não lê nem registra, sem novo login', async () => {
    logarComo(brunoId);
    await prisma.participacao.delete({ where: { usuarioId_grupoId: { usuarioId: brunoId, grupoId: grupoBId } } });

    const criar = await criarLancamento({ tipo: "SAIDA", descricao: "Depois", valor: "5", categoria: "Outros", data: "2026-10-12" });
    expect(criar.ok).toBe(false);
    expect((await excluirLancamento(idsDoGrupoB[0])).ok).toBe(false);
    expect(await prisma.lancamento.count({ where: { grupoId: grupoBId, excluidoEm: null } })).toBe(2);

    await prisma.participacao.create({ data: { usuarioId: brunoId, grupoId: grupoBId, papel: "ADMIN" } });
    await prisma.usuario.update({ where: { id: brunoId }, data: { grupoAtivoId: grupoBId } });
  });

  it('Scenario "Último membro sai" — o grupo excluído leva junto os lançamentos', async () => {
    logarComo(brunoId);
    expect(await sairDoGrupo()).toMatchObject({ ok: true });
    expect(await prisma.grupo.findUnique({ where: { id: grupoBId } })).toBeNull();
    expect(await prisma.lancamento.count({ where: { id: { in: idsDoGrupoB } } })).toBe(0);
  });
});
