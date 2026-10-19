// Tarefas 1.1 a 1.5 — cálculos da aba Resumo (spec resumo, Requirements
// "Saldo, entradas e saídas do mês", "Comparação com o mês anterior",
// "Gráfico dos últimos seis meses", "Saídas por categoria" e "Totais por
// pessoa").
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
  variacaoDasSaidas,
} from "@/lib/resumo";
import { somar } from "@/lib/format/moeda";

const DOMINIO = "@resumo.caixa.test";
const OUTUBRO = { ano: 2026, mes: 10 };
const SETEMBRO = { ano: 2026, mes: 9 };
const AGOSTO = { ano: 2026, mes: 8 };
const JULHO = { ano: 2026, mes: 7 };

let anaId: number;
let marceloId: number;
let joanaId: number; // membro sem lançamentos
let pedroId: number; // saiu do grupo, lançou em outubro
let brunoId: number; // saiu do grupo, lançou só em agosto
let grupoId: number;
let grupoVazioId: number;

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TRESUMO" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

async function lancar(dados: {
  autorId: number;
  tipo: "ENTRADA" | "SAIDA";
  valor: string;
  data: string;
  categoria?: string;
  excluidoEm?: Date;
}) {
  await prisma.lancamento.create({
    data: {
      grupoId,
      autorId: dados.autorId,
      tipo: dados.tipo,
      descricao: `${dados.tipo} ${dados.data}`,
      valor: new Prisma.Decimal(dados.valor),
      categoria: dados.categoria ?? (dados.tipo === "ENTRADA" ? "Salário" : "Contas"),
      data: new Date(`${dados.data}T00:00:00Z`),
      ...(dados.excluidoEm ? { excluidoEm: dados.excluidoEm } : {}),
    },
  });
}

beforeAll(async () => {
  await limpar();
  const criar = async (nome: string) =>
    (await prisma.usuario.create({ data: { nome, email: `${nome.toLowerCase()}${DOMINIO}`, senhaHash: "x" } })).id;
  anaId = await criar("Ana");
  marceloId = await criar("Marcelo");
  joanaId = await criar("Joana");
  pedroId = await criar("Pedro");
  brunoId = await criar("Bruno");
  grupoId = (await prisma.grupo.create({ data: { nome: "Casa", codigo: "TRESUMO-CASA" } })).id;
  grupoVazioId = (await prisma.grupo.create({ data: { nome: "Novo", codigo: "TRESUMO-NOVO" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: marceloId, grupoId, papel: "ADMIN" },
      { usuarioId: anaId, grupoId, papel: "MEMBRO" },
      { usuarioId: joanaId, grupoId, papel: "MEMBRO" },
      { usuarioId: anaId, grupoId: grupoVazioId, papel: "ADMIN" },
    ],
  });

  // Outubro: valores com centavos, um ex-membro e um excluído.
  await lancar({ autorId: anaId, tipo: "ENTRADA", valor: "5400.25", data: "2026-10-05" });
  await lancar({ autorId: marceloId, tipo: "SAIDA", valor: "1000.10", data: "2026-10-08" });
  await lancar({ autorId: pedroId, tipo: "SAIDA", valor: "200.05", data: "2026-10-09" });
  await lancar({ autorId: pedroId, tipo: "ENTRADA", valor: "100", data: "2026-10-31" });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "999", data: "2026-10-12", excluidoEm: new Date() });
  // Setembro: vazio. Agosto: só Bruno (ex-membro).
  await lancar({ autorId: brunoId, tipo: "SAIDA", valor: "800", data: "2026-08-15" });
  // Julho: o exemplo da spec para categorias.
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "1850", data: "2026-07-08", categoria: "Moradia" });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "520", data: "2026-07-08", categoria: "Moradia" });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "1600", data: "2026-07-03", categoria: "Mercado" });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "400", data: "2026-07-20", categoria: "Lazer" });
});

afterAll(limpar);

describe("totaisDoMes", () => {
  it('Scenario "Cálculo" — somas exatas em centavos, sem os excluídos', async () => {
    expect(await totaisDoMes(grupoId, OUTUBRO)).toEqual({ entradas: "5500.25", saidas: "1200.15", saldo: "4300.10" });
  });

  it('Scenario "Saldo negativo" — saldo com sinal de menos', async () => {
    expect(await totaisDoMes(grupoId, JULHO)).toEqual({ entradas: "0.00", saidas: "4370.00", saldo: "-4370.00" });
  });

  it("mês sem lançamentos dá zero", async () => {
    expect(await totaisDoMes(grupoId, SETEMBRO)).toEqual({ entradas: "0.00", saidas: "0.00", saldo: "0.00" });
  });
});

describe("comparação com o mês anterior", () => {
  it('Scenario "Saídas maiores" — R$ 5.500,00 contra R$ 5.000,00 é 10% maiores', () => {
    expect(variacaoDasSaidas("5500.00", "5000.00")).toEqual({ percentual: 10, direcao: "maiores" });
  });

  it('Scenario "Saídas menores"', () => {
    expect(variacaoDasSaidas("4000.00", "5000.00")).toEqual({ percentual: 20, direcao: "menores" });
  });

  it('Scenario "Sem base de comparação" — mês anterior sem saídas, mês sem saídas ou variação que arredonda para zero', () => {
    expect(variacaoDasSaidas("5000.00", "0.00")).toBeNull();
    expect(variacaoDasSaidas("0.00", "5000.00")).toBeNull();
    expect(variacaoDasSaidas("5020.00", "5000.00")).toBeNull(); // 0,4%
  });

  it("no banco: agosto contra julho, e outubro sem comparação porque setembro não tem saídas", async () => {
    expect(await comparacaoComMesAnterior(grupoId, AGOSTO)).toEqual({ percentual: 82, direcao: "menores", mesAnterior: JULHO });
    expect(await comparacaoComMesAnterior(grupoId, OUTUBRO)).toBeNull();
  });

  it("o mês anterior a janeiro é dezembro do ano anterior", async () => {
    expect(await comparacaoComMesAnterior(grupoId, { ano: 2027, mes: 1 }, "10.00")).toBeNull();
  });
});

describe("serieDeSeisMeses", () => {
  it('Scenario "Seis meses" — de maio a outubro, meses sem lançamento com zero', async () => {
    expect(await serieDeSeisMeses(grupoId, OUTUBRO)).toEqual([
      { mes: { ano: 2026, mes: 5 }, entradas: "0.00", saidas: "0.00" },
      { mes: { ano: 2026, mes: 6 }, entradas: "0.00", saidas: "0.00" },
      { mes: JULHO, entradas: "0.00", saidas: "4370.00" },
      { mes: AGOSTO, entradas: "0.00", saidas: "800.00" },
      { mes: SETEMBRO, entradas: "0.00", saidas: "0.00" },
      { mes: OUTUBRO, entradas: "5500.25", saidas: "1200.15" },
    ]);
  });

  it("atravessa a virada do ano", async () => {
    const serie = await serieDeSeisMeses(grupoId, { ano: 2027, mes: 2 });
    expect(serie.map((p) => p.mes)).toEqual([
      { ano: 2026, mes: 9 },
      { ano: 2026, mes: 10 },
      { ano: 2026, mes: 11 },
      { ano: 2026, mes: 12 },
      { ano: 2027, mes: 1 },
      { ano: 2027, mes: 2 },
    ]);
  });

  it('Scenario "Grupo novo" — seis meses sem barras', async () => {
    const serie = await serieDeSeisMeses(grupoVazioId, OUTUBRO);
    expect(serie).toHaveLength(6);
    expect(serie.every((p) => p.entradas === "0.00" && p.saidas === "0.00")).toBe(true);
  });
});

describe("saidasPorCategoria", () => {
  it('Scenario "Ordem e proporção" — Moradia, Mercado, Lazer; barra cheia na maior; percentuais somam 100', async () => {
    const categorias = await saidasPorCategoria(grupoId, JULHO);
    expect(categorias.map((c) => [c.categoria, c.valor, c.percentual])).toEqual([
      ["Moradia", "2370.00", 54],
      ["Mercado", "1600.00", 37],
      ["Lazer", "400.00", 9],
    ]);
    expect(categorias[0].proporcao).toBe(100);
    expect(categorias[1].proporcao).toBeCloseTo((1600 / 2370) * 100);
    expect(categorias.reduce((s, c) => s + c.percentual, 0)).toBe(100);
  });

  it('Scenario "Sem saídas" — lista vazia', async () => {
    expect(await saidasPorCategoria(grupoId, SETEMBRO)).toEqual([]);
  });
});

describe("totaisPorPessoa", () => {
  it('Scenarios "Tabela por pessoa" e "Ex-membro com lançamento no mês" — membros atuais (Joana com zero) e depois Pedro, ex-membro', async () => {
    expect(await totaisPorPessoa(grupoId, OUTUBRO)).toEqual([
      { id: anaId, nome: "Ana", entradas: "5400.25", saidas: "0.00", exMembro: false },
      { id: joanaId, nome: "Joana", entradas: "0.00", saidas: "0.00", exMembro: false },
      { id: marceloId, nome: "Marcelo", entradas: "0.00", saidas: "1000.10", exMembro: false },
      { id: pedroId, nome: "Pedro", entradas: "100.00", saidas: "200.05", exMembro: true },
    ]);
  });

  it('Scenario "Ex-membro sem lançamento no mês" — Bruno só aparece em agosto', async () => {
    expect((await totaisPorPessoa(grupoId, OUTUBRO)).some((p) => p.id === brunoId)).toBe(false);
    expect((await totaisPorPessoa(grupoId, AGOSTO)).find((p) => p.id === brunoId)).toMatchObject({ saidas: "800.00", exMembro: true });
  });

  it('Scenario "Linhas fecham com os totais" — em todos os meses', async () => {
    for (const mes of [JULHO, AGOSTO, SETEMBRO, OUTUBRO]) {
      const [pessoas, totais] = await Promise.all([totaisPorPessoa(grupoId, mes), totaisDoMes(grupoId, mes)]);
      expect(somar(pessoas.map((p) => p.entradas)).toFixed(2)).toBe(totais.entradas);
      expect(somar(pessoas.map((p) => p.saidas)).toFixed(2)).toBe(totais.saidas);
    }
  });
});

describe("estados vazios", () => {
  it("distingue grupo sem lançamentos de mês sem lançamentos", async () => {
    expect(await grupoTemLancamentos(grupoVazioId)).toBe(false);
    expect(await grupoTemLancamentos(grupoId)).toBe(true);
    expect(await mesTemLancamentos(grupoId, SETEMBRO)).toBe(false);
    expect(await mesTemLancamentos(grupoId, OUTUBRO)).toBe(true);
  });
});
