// ============================================================================
// Leituras da aba Lançamentos (capability: lancamentos). Sempre pelo grupo de
// getGrupoAtual(), sempre sem as linhas excluídas (`excluidoEm = null`).
//
// Valores saem como string (Prisma.Decimal não atravessa para o Client
// Component) e os totais vêm do Postgres (`SUM`, exato), nunca de `number`.
// Ver design.md, "Dinheiro em Decimal(10, 2)", "Mês e filtros na URL" e
// "Ex-membros na lista e no filtro".
// ============================================================================

import { Prisma, type TipoLancamento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deDataDoBanco,
  formatarDiaMes,
  hoje,
  limitesDoMes,
  paraChaveDeMes,
  paraMesDeChave,
  type MesCalendario,
} from "@/lib/timezone";

export interface FiltrosLista {
  mes: MesCalendario;
  tipo: TipoLancamento | null;
  autorId: number | null;
}

export interface LinhaLancamento {
  id: number;
  tipo: TipoLancamento;
  descricao: string;
  categoria: string;
  /** Valor positivo, como string decimal ("412.80"). */
  valor: string;
  /** "dd/mm". */
  dia: string;
  autorId: number;
  autorNome: string;
  /** O autor não participa mais do grupo. */
  exMembro: boolean;
}

export interface ListaDoMes {
  linhas: LinhaLancamento[];
  totalEntradas: string;
  totalSaidas: string;
}

export interface PessoaDoFiltro {
  id: number;
  nome: string;
  exMembro: boolean;
}

type ParametrosUrl = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

function mesAtual(agora: Date): MesCalendario {
  const { ano, mes } = hoje(agora);
  return { ano, mes };
}

/**
 * Filtros da URL conferidos no servidor. `mes` e `tipo` inválidos caem no
 * padrão (mês atual, todos os tipos). `autor` só vale se for membro atual do
 * grupo ou autor de algum lançamento dele — senão fica em "Todas" (inclusive
 * depois de uma troca de grupo feita pelo sistema, que não limpa a URL).
 */
export async function resolverFiltros(grupoId: number, parametros: ParametrosUrl, agora = new Date()): Promise<FiltrosLista> {
  const mes = paraMesDeChave(primeiro(parametros.mes)) ?? mesAtual(agora);
  const tipoBruto = primeiro(parametros.tipo);
  const tipo = tipoBruto === "ENTRADA" || tipoBruto === "SAIDA" ? tipoBruto : null;

  let autorId: number | null = null;
  const autorBruto = Number(primeiro(parametros.autor));
  if (Number.isInteger(autorBruto) && autorBruto > 0) {
    const [participa, temLancamento] = await Promise.all([
      prisma.participacao.count({ where: { grupoId, usuarioId: autorBruto } }),
      prisma.lancamento.count({ where: { grupoId, autorId: autorBruto } }),
    ]);
    if (participa > 0 || temLancamento > 0) autorId = autorBruto;
  }

  return { mes, tipo, autorId };
}

function filtroDoBanco(grupoId: number, { mes, tipo, autorId }: FiltrosLista): Prisma.LancamentoWhereInput {
  const { inicio, fim } = limitesDoMes(mes);
  return {
    grupoId,
    excluidoEm: null,
    data: { gte: inicio, lt: fim },
    ...(tipo ? { tipo } : {}),
    ...(autorId ? { autorId } : {}),
  };
}

/** Lançamentos do mês com os filtros, do mais recente para o mais antigo
 * (no mesmo dia, o último registrado primeiro), e os totais do que está
 * filtrado. */
export async function listarLancamentos(grupoId: number, filtros: FiltrosLista): Promise<ListaDoMes> {
  const where = filtroDoBanco(grupoId, filtros);
  const [lancamentos, totais, membros] = await Promise.all([
    prisma.lancamento.findMany({
      where,
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }, { id: "desc" }],
      include: { autor: { select: { nome: true } } },
    }),
    prisma.lancamento.groupBy({ by: ["tipo"], where, _sum: { valor: true } }),
    prisma.participacao.findMany({ where: { grupoId }, select: { usuarioId: true } }),
  ]);

  const idsMembros = new Set(membros.map((m) => m.usuarioId));
  const total = (tipo: TipoLancamento) =>
    (totais.find((t) => t.tipo === tipo)?._sum.valor ?? new Prisma.Decimal(0)).toFixed(2);

  return {
    linhas: lancamentos.map((l) => ({
      id: l.id,
      tipo: l.tipo,
      descricao: l.descricao,
      categoria: l.categoria,
      valor: l.valor.toFixed(2),
      dia: formatarDiaMes(deDataDoBanco(l.data)),
      autorId: l.autorId,
      autorNome: l.autor.nome,
      exMembro: !idsMembros.has(l.autorId),
    })),
    totalEntradas: total("ENTRADA"),
    totalSaidas: total("SAIDA"),
  };
}

/** Opções do filtro Pessoa: os membros atuais e os ex-membros que têm
 * lançamentos no mês, num só filtro, em ordem alfabética. */
export async function pessoasDoFiltro(grupoId: number, mes: MesCalendario): Promise<PessoaDoFiltro[]> {
  const { inicio, fim } = limitesDoMes(mes);
  const [membros, autoresDoMes] = await Promise.all([
    prisma.participacao.findMany({ where: { grupoId }, select: { usuario: { select: { id: true, nome: true } } } }),
    prisma.lancamento.findMany({
      where: { grupoId, excluidoEm: null, data: { gte: inicio, lt: fim } },
      distinct: ["autorId"],
      select: { autor: { select: { id: true, nome: true } } },
    }),
  ]);

  const pessoas = new Map<number, PessoaDoFiltro>();
  for (const { usuario } of membros) pessoas.set(usuario.id, { ...usuario, exMembro: false });
  for (const { autor } of autoresDoMes) if (!pessoas.has(autor.id)) pessoas.set(autor.id, { ...autor, exMembro: true });

  return [...pessoas.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id - b.id);
}

/** Meses do seletor: o mês atual e todos os meses com lançamentos do grupo,
 * do mais recente para o mais antigo. */
export async function mesesDoSeletor(grupoId: number, agora = new Date()): Promise<MesCalendario[]> {
  const linhas = await prisma.$queryRaw<{ mes: Date }[]>`
    SELECT DISTINCT date_trunc('month', "data")::date AS mes
    FROM lancamentos
    WHERE "grupoId" = ${grupoId} AND "excluidoEm" IS NULL`;

  const chaves = new Set(linhas.map(({ mes }) => paraChaveDeMes(deDataDoBanco(mes))));
  chaves.add(paraChaveDeMes(mesAtual(agora)));
  return [...chaves]
    .sort()
    .reverse()
    .map((chave) => paraMesDeChave(chave)!);
}
