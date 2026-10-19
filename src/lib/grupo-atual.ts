// ============================================================================
// getGrupoAtual() — ponto único de decisão de acesso a dados de grupo
// (capability: grupos). Toda leitura e escrita de dados de grupo usa o
// `grupoId` que vem daqui, sempre junto do id recebido do cliente:
// `where: { id, grupoId }`. `lancamentos` e `resumo-mensal` reutilizam este
// helper.
//
// O grupo ativo fica só em Usuario.grupoAtivoId (o banco é a única fonte —
// ver design.md, "Grupo ativo no banco, com fallback em getGrupoAtual()").
// Numa consulta, busca a conta e as participações dela:
//   - participa do grupo ativo: devolve { grupoId, papel };
//   - não participa mais (removida, grupo excluído) ou sem grupo ativo:
//     escolhe a participação mais antiga (src/lib/grupo-selecao.ts), grava em
//     grupoAtivoId e devolve `trocouDe` com o nome do grupo anterior, quando
//     ele ainda existe — o layout mostra o aviso uma vez;
//   - sem nenhuma participação: grava null e lança SemGrupoAtivoError.
// A conferência da sessão (conta existe, senha não redefinida depois do
// login) é a mesma de getUsuarioAtual().
// ============================================================================

import * as React from "react";
import { redirect } from "next/navigation";
import type { PapelGrupo } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { escolherGrupoAtivo } from "@/lib/grupo-selecao";
import { ROTA_LOGIN } from "@/lib/rotas-protegidas";
import {
  idDaSessao,
  sessaoAnteriorASenha,
  SELECT_USUARIO_ATUAL,
  type DadosSessao,
  type UsuarioAtual,
} from "@/lib/usuario-atual";

// `cache` só existe no React que o Next usa nos Server Components. Fora dele
// (Vitest), a função roda sem memoização.
const memoizarPorRequisicao: <F extends (...args: never[]) => unknown>(fn: F) => F =
  (React as { cache?: <F>(fn: F) => F }).cache ?? ((fn) => fn);

export class SemGrupoAtivoError extends Error {
  constructor() {
    super("A pessoa não participa de nenhum grupo.");
    this.name = "SemGrupoAtivoError";
  }
}

export interface GrupoAtual {
  usuario: UsuarioAtual;
  grupoId: number;
  grupoNome: string;
  papel: PapelGrupo;
  /** Nome do grupo que deixou de valer nesta requisição, para o aviso. */
  trocouDe?: string;
  /** Grupos da pessoa, na ordem em que ela entrou — para o seletor do topo. */
  grupos: { id: number; nome: string }[];
}

/** Regra completa a partir dos dados da sessão. `null` = sessão inválida. */
export async function resolverGrupoAtual(sessao: DadosSessao | null | undefined): Promise<GrupoAtual | null> {
  const id = idDaSessao(sessao);
  if (id === null) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: {
      ...SELECT_USUARIO_ATUAL,
      participacoes: { select: { grupoId: true, entrouEm: true, papel: true, grupo: { select: { nome: true } } } },
    },
  });
  if (!usuario || sessaoAnteriorASenha(usuario, sessao)) return null;

  const { participacoes, ...dadosUsuario } = usuario;
  const escolhido = escolherGrupoAtivo(usuario.grupoAtivoId, participacoes);

  if (escolhido === null) {
    if (usuario.grupoAtivoId !== null) {
      await prisma.usuario.update({ where: { id }, data: { grupoAtivoId: null } });
    }
    throw new SemGrupoAtivoError();
  }

  let trocouDe: string | undefined;
  if (escolhido !== usuario.grupoAtivoId) {
    if (usuario.grupoAtivoId !== null) {
      const anterior = await prisma.grupo.findUnique({ where: { id: usuario.grupoAtivoId }, select: { nome: true } });
      trocouDe = anterior?.nome;
    }
    await prisma.usuario.update({ where: { id }, data: { grupoAtivoId: escolhido } });
  }

  const participacao = participacoes.find((p) => p.grupoId === escolhido)!;
  const grupos = [...participacoes]
    .sort((a, b) => a.entrouEm.getTime() - b.entrouEm.getTime() || a.grupoId - b.grupoId)
    .map((p) => ({ id: p.grupoId, nome: p.grupo.nome }));
  return {
    usuario: { ...dadosUsuario, grupoAtivoId: escolhido },
    grupoId: escolhido,
    grupoNome: participacao.grupo.nome,
    papel: participacao.papel,
    trocouDe,
    grupos,
  };
}

/**
 * Para Server Components e Server Actions. Sem sessão válida leva a /login;
 * sem grupo lança SemGrupoAtivoError, que a interface trata mostrando o estado
 * "sem grupo". Memoizado por requisição (`cache`): layout e página veem o
 * mesmo resultado, e o fallback acontece uma vez só — o aviso não se perde.
 */
export const getGrupoAtual = memoizarPorRequisicao(async (): Promise<GrupoAtual> => {
  const sessao = await auth();
  const grupo = await resolverGrupoAtual(sessao?.user);
  if (!grupo) redirect(ROTA_LOGIN);
  return grupo;
});

/** Como getGrupoAtual(), mas devolve `null` em vez de lançar quando a pessoa
 * não participa de nenhum grupo. */
export async function getGrupoAtualOuNull(): Promise<GrupoAtual | null> {
  try {
    return await getGrupoAtual();
  } catch (erro) {
    if (erro instanceof SemGrupoAtivoError) return null;
    throw erro;
  }
}
