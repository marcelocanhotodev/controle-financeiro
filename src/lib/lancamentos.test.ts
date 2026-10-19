// Tarefas 3.1 e 3.2 — leituras da aba Lançamentos (spec lancamentos,
// Requirements "Lista de lançamentos do mês", "Seleção de mês", "Filtros da
// lista" e "Totais da lista").
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listarLancamentos, mesesDoSeletor, pessoasDoFiltro, resolverFiltros } from "@/lib/lancamentos";

const DOMINIO = "@leitura-lancamento.caixa.test";
const OUTUBRO = { ano: 2026, mes: 10 };
const AGORA = new Date("2026-10-19T15:00:00Z");

let anaId: number;
let marceloId: number;
let pedroId: number; // saiu do grupo
let foraId: number; // nunca participou
let grupoId: number;
let outroGrupoId: number;

async function limpar() {
  await prisma.grupo.deleteMany({ where: { codigo: { startsWith: "TLLEIT" } } });
  await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } });
}

async function lancar(dados: {
  autorId: number;
  tipo: "ENTRADA" | "SAIDA";
  valor: string;
  data: string;
  descricao?: string;
  criadoEm?: string;
  excluidoEm?: Date;
  grupo?: number;
}) {
  return prisma.lancamento.create({
    data: {
      grupoId: dados.grupo ?? grupoId,
      autorId: dados.autorId,
      tipo: dados.tipo,
      descricao: dados.descricao ?? `${dados.tipo} ${dados.data}`,
      valor: new Prisma.Decimal(dados.valor),
      categoria: dados.tipo === "ENTRADA" ? "Salário" : "Mercado",
      data: new Date(`${dados.data}T00:00:00Z`),
      ...(dados.criadoEm ? { criadoEm: new Date(dados.criadoEm) } : {}),
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
  pedroId = await criar("Pedro");
  foraId = await criar("Fora");
  grupoId = (await prisma.grupo.create({ data: { nome: "Casa", codigo: "TLLEIT-CASA" } })).id;
  outroGrupoId = (await prisma.grupo.create({ data: { nome: "Outro", codigo: "TLLEIT-OUTRO" } })).id;
  await prisma.participacao.createMany({
    data: [
      { usuarioId: anaId, grupoId, papel: "MEMBRO" },
      { usuarioId: marceloId, grupoId, papel: "ADMIN" },
      { usuarioId: foraId, grupoId: outroGrupoId, papel: "ADMIN" },
    ],
  });

  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "412.80", data: "2026-10-10", descricao: "Mercado", criadoEm: "2026-10-10T12:00:00Z" });
  await lancar({ autorId: marceloId, tipo: "ENTRADA", valor: "6200", data: "2026-10-10", descricao: "Salário", criadoEm: "2026-10-10T18:00:00Z" });
  await lancar({ autorId: pedroId, tipo: "SAIDA", valor: "189.90", data: "2026-10-08", descricao: "Luz" });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "999", data: "2026-10-12", descricao: "Excluído", excluidoEm: new Date() });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "50", data: "2026-05-03", descricao: "Maio" });
  await lancar({ autorId: anaId, tipo: "SAIDA", valor: "70", data: "2026-06-20", descricao: "Junho" });
  await lancar({ autorId: foraId, tipo: "SAIDA", valor: "1", data: "2026-10-11", descricao: "De outro grupo", grupo: outroGrupoId });
});

afterAll(limpar);

const todos = { mes: OUTUBRO, tipo: null, autorId: null };

describe("listarLancamentos", () => {
  it('Scenario "Ordem" — dias mais recentes primeiro e, no mesmo dia, o último registrado primeiro; sem excluídos nem outros grupos', async () => {
    const { linhas } = await listarLancamentos(grupoId, todos);
    expect(linhas.map((l) => l.descricao)).toEqual(["Salário", "Mercado", "Luz"]);
  });

  it('Scenario "Cada linha" — "10/10", categoria, autor e valor como string exata', async () => {
    const { linhas } = await listarLancamentos(grupoId, todos);
    expect(linhas[1]).toMatchObject({
      dia: "10/10",
      descricao: "Mercado",
      categoria: "Mercado",
      autorNome: "Ana",
      valor: "412.80",
      tipo: "SAIDA",
      exMembro: false,
    });
  });

  it('Scenario "Autor que saiu do grupo" — os lançamentos de Pedro continuam, marcados como ex-membro', async () => {
    const { linhas } = await listarLancamentos(grupoId, todos);
    expect(linhas.find((l) => l.descricao === "Luz")).toMatchObject({ autorNome: "Pedro", exMembro: true });
  });

  it('Scenarios "Filtrar por tipo", "Filtrar por pessoa" e "Ex-membros no mesmo filtro"', async () => {
    expect((await listarLancamentos(grupoId, { ...todos, tipo: "SAIDA" })).linhas.map((l) => l.descricao)).toEqual([
      "Mercado",
      "Luz",
    ]);
    expect((await listarLancamentos(grupoId, { ...todos, autorId: anaId })).linhas.map((l) => l.descricao)).toEqual([
      "Mercado",
    ]);
    expect((await listarLancamentos(grupoId, { ...todos, autorId: pedroId })).linhas.map((l) => l.descricao)).toEqual([
      "Luz",
    ]);
  });

  it('Scenario "Rodapé acompanha os filtros" — totais exatos só do que está filtrado', async () => {
    const tudo = await listarLancamentos(grupoId, todos);
    expect(tudo).toMatchObject({ totalEntradas: "6200.00", totalSaidas: "602.70" });
    const saidas = await listarLancamentos(grupoId, { ...todos, tipo: "SAIDA" });
    expect(saidas).toMatchObject({ totalEntradas: "0.00", totalSaidas: "602.70" });
  });

  it('Scenario "Nada encontrado" — mês sem lançamentos devolve lista vazia e totais zerados', async () => {
    const vazio = await listarLancamentos(grupoId, { ...todos, mes: { ano: 2025, mes: 1 } });
    expect(vazio).toEqual({ linhas: [], totalEntradas: "0.00", totalSaidas: "0.00" });
  });
});

describe("pessoasDoFiltro", () => {
  it("membros atuais e ex-membros com lançamentos no mês, em ordem alfabética, num só filtro", async () => {
    expect(await pessoasDoFiltro(grupoId, OUTUBRO)).toEqual([
      { id: anaId, nome: "Ana", exMembro: false },
      { id: marceloId, nome: "Marcelo", exMembro: false },
      { id: pedroId, nome: "Pedro", exMembro: true },
    ]);
  });

  it("ex-membro sem lançamento no mês não aparece", async () => {
    expect((await pessoasDoFiltro(grupoId, { ano: 2026, mes: 5 })).map((p) => p.nome)).toEqual(["Ana", "Marcelo"]);
  });
});

describe("mesesDoSeletor", () => {
  it('Scenario "Opções do seletor" — mês atual e meses com lançamentos, do mais recente para o mais antigo', async () => {
    expect(await mesesDoSeletor(grupoId, new Date("2026-12-05T12:00:00Z"))).toEqual([
      { ano: 2026, mes: 12 },
      { ano: 2026, mes: 10 },
      { ano: 2026, mes: 6 },
      { ano: 2026, mes: 5 },
    ]);
  });
});

describe("resolverFiltros", () => {
  it("lê mês, tipo e autor válidos da URL", async () => {
    expect(await resolverFiltros(grupoId, { mes: "2026-06", tipo: "ENTRADA", autor: String(anaId) }, AGORA)).toEqual({
      mes: { ano: 2026, mes: 6 },
      tipo: "ENTRADA",
      autorId: anaId,
    });
  });

  it("aceita como autor um ex-membro que tem lançamentos no grupo", async () => {
    expect((await resolverFiltros(grupoId, { autor: String(pedroId) }, AGORA)).autorId).toBe(pedroId);
  });

  it('Scenario "Pessoa da URL que não é do grupo" — autor de outro grupo ou inexistente fica em "Todas"', async () => {
    expect((await resolverFiltros(grupoId, { autor: String(foraId) }, AGORA)).autorId).toBeNull();
    expect((await resolverFiltros(grupoId, { autor: "999999999" }, AGORA)).autorId).toBeNull();
    expect((await resolverFiltros(grupoId, { autor: "abc" }, AGORA)).autorId).toBeNull();
  });

  it("tipo e mês inválidos caem no padrão (todos os tipos, mês atual em São Paulo)", async () => {
    expect(await resolverFiltros(grupoId, { mes: "2026-13", tipo: "QUALQUER" }, AGORA)).toEqual({
      mes: OUTUBRO,
      tipo: null,
      autorId: null,
    });
  });
});
