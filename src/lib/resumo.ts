// ============================================================================
// Leituras da aba Resumo (capability: resumo). Sempre pelo grupo de
// getGrupoAtual(), sempre sem as linhas excluídas (`excluidoEm = null`).
//
// Somas no Postgres (exatas) e valores saindo como string, como em
// src/lib/lancamentos.ts. Percentuais e variação são calculados com
// Prisma.Decimal e só viram número inteiro para exibição. Ver design.md,
// "Agregações no Postgres, em src/lib/resumo.ts".
// ============================================================================

import { Prisma, type TipoLancamento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deDataDoBanco,
  deslocarMes,
  hoje,
  limitesDoMes,
  paraChaveDeMes,
  paraMesDeChave,
  type MesCalendario,
} from "@/lib/timezone";

const ZERO = new Prisma.Decimal(0);

export interface TotaisDoMes {
  entradas: string;
  saidas: string;
  /** Entradas − saídas; pode ser negativo ("-150.00"). */
  saldo: string;
}

export interface Comparacao {
  /** Variação inteira, sem sinal (10 para "10% maiores"). */
  percentual: number;
  direcao: "maiores" | "menores";
  mesAnterior: MesCalendario;
}

export interface PontoDaSerie {
  mes: MesCalendario;
  entradas: string;
  saidas: string;
}

export interface CategoriaDoMes {
  categoria: string;
  valor: string;
  /** Percentual inteiro do total de saídas do mês. */
  percentual: number;
  /** Largura da barra, de 0 a 100, proporcional à maior categoria. */
  proporcao: number;
}

export interface PessoaDoResumo {
  id: number;
  nome: string;
  entradas: string;
  saidas: string;
  /** Autor que não participa mais do grupo. */
  exMembro: boolean;
}

function filtroDoMes(grupoId: number, mes: MesCalendario): Prisma.LancamentoWhereInput {
  const { inicio, fim } = limitesDoMes(mes);
  return { grupoId, excluidoEm: null, data: { gte: inicio, lt: fim } };
}

function somaPorTipo(linhas: { tipo: TipoLancamento; _sum: { valor: Prisma.Decimal | null } }[], tipo: TipoLancamento) {
  return linhas.find((l) => l.tipo === tipo)?._sum.valor ?? ZERO;
}

/** Entradas, saídas e saldo do mês. */
export async function totaisDoMes(grupoId: number, mes: MesCalendario): Promise<TotaisDoMes> {
  const linhas = await prisma.lancamento.groupBy({ by: ["tipo"], where: filtroDoMes(grupoId, mes), _sum: { valor: true } });
  const entradas = somaPorTipo(linhas, "ENTRADA");
  const saidas = somaPorTipo(linhas, "SAIDA");
  return { entradas: entradas.toFixed(2), saidas: saidas.toFixed(2), saldo: entradas.minus(saidas).toFixed(2) };
}

/**
 * Variação das saídas em relação ao mês anterior, arredondada para inteiro
 * como no protótipo (`Math.round`). `null` quando um dos meses não tem saídas
 * ou o arredondamento dá zero.
 */
export function variacaoDasSaidas(saidasDoMes: string, saidasDoAnterior: string): Omit<Comparacao, "mesAnterior"> | null {
  const atual = new Prisma.Decimal(saidasDoMes);
  const anterior = new Prisma.Decimal(saidasDoAnterior);
  if (atual.lte(0) || anterior.lte(0)) return null;
  const percentual = Math.round(atual.minus(anterior).div(anterior).times(100).toNumber());
  if (percentual === 0) return null;
  return { percentual: Math.abs(percentual), direcao: percentual > 0 ? "maiores" : "menores" };
}

/** Comparação das saídas do mês com as do mês anterior. */
export async function comparacaoComMesAnterior(
  grupoId: number,
  mes: MesCalendario,
  saidasDoMes?: string,
): Promise<Comparacao | null> {
  const mesAnterior = deslocarMes(mes, -1);
  const [atual, anterior] = await Promise.all([
    saidasDoMes ?? totaisDoMes(grupoId, mes).then((t) => t.saidas),
    totaisDoMes(grupoId, mesAnterior).then((t) => t.saidas),
  ]);
  const variacao = variacaoDasSaidas(atual, anterior);
  return variacao ? { ...variacao, mesAnterior } : null;
}

/** Entradas e saídas dos seis meses que terminam em `mes`, do mais antigo
 * para o mais recente; meses sem lançamento vêm com zero. */
export async function serieDeSeisMeses(grupoId: number, mes: MesCalendario): Promise<PontoDaSerie[]> {
  // Datas como texto `yyyy-mm-dd` convertidas no banco: não dependem do fuso
  // da sessão do Postgres. `grupoId` sempre por parâmetro.
  const primeiro = `${paraChaveDeMes(deslocarMes(mes, -5))}-01`;
  const ultimo = `${paraChaveDeMes(mes)}-01`;
  const linhas = await prisma.$queryRaw<{ mes: Date; entradas: Prisma.Decimal; saidas: Prisma.Decimal }[]>`
    SELECT m.mes::date AS mes,
           COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'ENTRADA'), 0) AS entradas,
           COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'SAIDA'), 0) AS saidas
    FROM generate_series(${primeiro}::date, ${ultimo}::date, interval '1 month') AS m(mes)
    LEFT JOIN lancamentos l
      ON date_trunc('month', l."data")::date = m.mes::date
     AND l."grupoId" = ${grupoId}
     AND l."excluidoEm" IS NULL
    GROUP BY m.mes
    ORDER BY m.mes`;

  return linhas.map((linha) => {
    const { ano, mes: numero } = deDataDoBanco(linha.mes);
    return {
      mes: { ano, mes: numero },
      entradas: new Prisma.Decimal(linha.entradas).toFixed(2),
      saidas: new Prisma.Decimal(linha.saidas).toFixed(2),
    };
  });
}

/** Saídas do mês por categoria, da maior para a menor (empate: nome). */
export async function saidasPorCategoria(grupoId: number, mes: MesCalendario): Promise<CategoriaDoMes[]> {
  const linhas = await prisma.lancamento.groupBy({
    by: ["categoria"],
    where: { ...filtroDoMes(grupoId, mes), tipo: "SAIDA" },
    _sum: { valor: true },
  });
  const categorias = linhas
    .map((l) => ({ categoria: l.categoria, valor: l._sum.valor ?? ZERO }))
    .sort((a, b) => b.valor.comparedTo(a.valor) || a.categoria.localeCompare(b.categoria, "pt-BR"));
  if (categorias.length === 0) return [];

  const total = categorias.reduce((soma, c) => soma.plus(c.valor), ZERO);
  const maior = categorias[0].valor;
  return categorias.map(({ categoria, valor }) => ({
    categoria,
    valor: valor.toFixed(2),
    percentual: Math.round(valor.div(total).times(100).toNumber()),
    // Mínimo de 2% para a barra de uma categoria pequena não sumir (protótipo).
    proporcao: Math.max(2, valor.div(maior).times(100).toNumber()),
  }));
}

/**
 * Totais do mês por pessoa: todos os membros atuais (R$ 0,00 para quem não
 * lançou) e os ex-membros que têm lançamento no mês. Membros atuais primeiro,
 * depois ex-membros, cada parte em ordem alfabética. A soma das linhas é igual
 * aos totais do mês.
 */
export async function totaisPorPessoa(grupoId: number, mes: MesCalendario): Promise<PessoaDoResumo[]> {
  const [somas, membros] = await Promise.all([
    prisma.lancamento.groupBy({ by: ["autorId", "tipo"], where: filtroDoMes(grupoId, mes), _sum: { valor: true } }),
    prisma.participacao.findMany({ where: { grupoId }, select: { usuario: { select: { id: true, nome: true } } } }),
  ]);

  const idsMembros = new Set(membros.map((m) => m.usuario.id));
  const idsExMembros = [...new Set(somas.map((s) => s.autorId))].filter((id) => !idsMembros.has(id));
  const exMembros = idsExMembros.length
    ? await prisma.usuario.findMany({ where: { id: { in: idsExMembros } }, select: { id: true, nome: true } })
    : [];

  const linha = (pessoa: { id: number; nome: string }, exMembro: boolean): PessoaDoResumo => {
    const doAutor = somas.filter((s) => s.autorId === pessoa.id);
    return {
      ...pessoa,
      entradas: somaPorTipo(doAutor, "ENTRADA").toFixed(2),
      saidas: somaPorTipo(doAutor, "SAIDA").toFixed(2),
      exMembro,
    };
  };
  const porNome = (a: { id: number; nome: string }, b: { id: number; nome: string }) =>
    a.nome.localeCompare(b.nome, "pt-BR") || a.id - b.id;

  return [
    ...membros.map((m) => m.usuario).sort(porNome).map((p) => linha(p, false)),
    ...exMembros.sort(porNome).map((p) => linha(p, true)),
  ];
}

/** Se o grupo tem algum lançamento (não excluído), em qualquer mês. */
export async function grupoTemLancamentos(grupoId: number): Promise<boolean> {
  return (await prisma.lancamento.count({ where: { grupoId, excluidoEm: null }, take: 1 })) > 0;
}

/** Se o mês tem algum lançamento (não excluído). */
export async function mesTemLancamentos(grupoId: number, mes: MesCalendario): Promise<boolean> {
  return (await prisma.lancamento.count({ where: filtroDoMes(grupoId, mes), take: 1 })) > 0;
}

/** Mês de `?mes=` na URL; inválido ou ausente cai no mês atual. */
export function resolverMes(parametro: string | string[] | undefined, agora = new Date()): MesCalendario {
  const { ano, mes } = hoje(agora);
  return paraMesDeChave(Array.isArray(parametro) ? parametro[0] : parametro) ?? { ano, mes };
}

export interface ResumoDoMes {
  totais: TotaisDoMes;
  comparacao: Comparacao | null;
  serie: PontoDaSerie[];
  categorias: CategoriaDoMes[];
  pessoas: PessoaDoResumo[];
  /** Grupo sem nenhum lançamento: mostra o convite para o primeiro. */
  grupoVazio: boolean;
  /** Mês sem lançamentos num grupo que tem lançamentos em outros meses. */
  mesVazio: boolean;
}

/** Tudo o que a aba Resumo mostra para o mês. */
export async function carregarResumo(grupoId: number, mes: MesCalendario): Promise<ResumoDoMes> {
  const totais = await totaisDoMes(grupoId, mes);
  const [comparacao, serie, categorias, pessoas, temNoGrupo, temNoMes] = await Promise.all([
    comparacaoComMesAnterior(grupoId, mes, totais.saidas),
    serieDeSeisMeses(grupoId, mes),
    saidasPorCategoria(grupoId, mes),
    totaisPorPessoa(grupoId, mes),
    grupoTemLancamentos(grupoId),
    mesTemLancamentos(grupoId, mes),
  ]);
  return { totais, comparacao, serie, categorias, pessoas, grupoVazio: !temNoGrupo, mesVazio: temNoGrupo && !temNoMes };
}
