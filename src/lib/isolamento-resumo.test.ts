// Tarefa 1.6 — isolamento do Resumo entre grupos. Nenhuma função de
// src/lib/resumo.ts soma lançamentos de outro grupo, nem traz como
// "ex-membro" um autor que só lançou em outro grupo — inclusive a série de
// seis meses, que usa $queryRaw.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  comparacaoComMesAnterior,
  grupoTemLancamentos,
  mesTemLancamentos,
  saidasPorCategoria,
  serieDeSeisMeses,
  totaisDoMes,
  totaisPorPessoa,
} from "@/lib/resumo";

const DOMINIO = "@isolamento-resumo.caixa.test";
const OUTUBRO = { ano: 2026, mes: 10 };

let anaId: number; // só do grupo A
let brunoId: number; // só do grupo B
let grupoAId: number;
let grupoBId: number;

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TISOR" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

beforeAll(async () => {
  await limpar();
  anaId = (await prisma.usuario.create({ data: { nome: "Ana", email: `ana${DOMINIO}`, senhaHash: "x" } })).id;
  brunoId = (await prisma.usuario.create({ data: { nome: "Bruno", email: `bruno${DOMINIO}`, senhaHash: "x" } })).id;
  grupoAId = (await prisma.grupo.create({ data: { nome: "Grupo A", codigo: "TISOR-000A" } })).id;
  grupoBId = (await prisma.grupo.create({ data: { nome: "Grupo B", codigo: "TISOR-000B" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: anaId, grupoId: grupoAId, papel: "ADMIN" },
      { usuarioId: brunoId, grupoId: grupoBId, papel: "ADMIN" },
    ],
  });

  // Só o grupo B tem lançamentos, em outubro e setembro.
  for (const [tipo, data] of [
    ["ENTRADA", "2026-10-05"],
    ["SAIDA", "2026-10-06"],
    ["SAIDA", "2026-09-06"],
  ] as const) {
    await prisma.lancamento.create({
      data: {
        grupoId: grupoBId,
        autorId: brunoId,
        tipo,
        descricao: "Do grupo B",
        valor: new Prisma.Decimal("100"),
        categoria: "Viagem",
        data: new Date(`${data}T00:00:00Z`),
      },
    });
  }
});

afterAll(limpar);

describe("isolamento do Resumo (grupo A)", () => {
  it("nenhuma função soma os lançamentos do grupo B", async () => {
    expect(await totaisDoMes(grupoAId, OUTUBRO)).toEqual({ entradas: "0.00", saidas: "0.00", saldo: "0.00" });
    expect(await comparacaoComMesAnterior(grupoAId, OUTUBRO)).toBeNull();
    expect((await serieDeSeisMeses(grupoAId, OUTUBRO)).every((p) => p.entradas === "0.00" && p.saidas === "0.00")).toBe(true);
    expect(await saidasPorCategoria(grupoAId, OUTUBRO)).toEqual([]);
    expect(await grupoTemLancamentos(grupoAId)).toBe(false);
    expect(await mesTemLancamentos(grupoAId, OUTUBRO)).toBe(false);
  });

  it('"Quem registrou" não traz o autor do grupo B como ex-membro', async () => {
    expect(await totaisPorPessoa(grupoAId, OUTUBRO)).toEqual([
      { id: anaId, nome: "Ana", entradas: "0.00", saidas: "0.00", exMembro: false },
    ]);
  });

  it("o grupo B continua vendo os próprios valores (controle)", async () => {
    expect(await totaisDoMes(grupoBId, OUTUBRO)).toEqual({ entradas: "100.00", saidas: "100.00", saldo: "0.00" });
    expect((await serieDeSeisMeses(grupoBId, OUTUBRO)).slice(-2).map((p) => p.saidas)).toEqual(["100.00", "100.00"]);
  });
});
