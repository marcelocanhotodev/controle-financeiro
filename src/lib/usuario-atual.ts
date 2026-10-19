// ============================================================================
// getUsuarioAtual() — confere a sessão no banco (capability: autenticacao,
// Requirements "Proteção de acesso" e "Sessões encerradas ao redefinir a
// senha"). Toda Server Action e página interna passa por aqui, direta ou
// indiretamente (getGrupoAtual() se apoia nas mesmas regras).
//
// Recusa, levando a /login, quando não há sessão, quando a conta não existe
// mais ou quando a sessão foi emitida antes da última redefinição de senha.
// O middleware (Edge, sem Prisma) só confere se existe sessão.
//
// É o único lugar que converte o id da sessão (string) para o Int do banco.
// ============================================================================

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROTA_LOGIN } from "@/lib/rotas-protegidas";

export interface DadosSessao {
  id?: string;
  emitidoEm?: number;
}

/** Campos da conta que podem circular pelo app — nunca `senhaHash`. */
export const SELECT_USUARIO_ATUAL = {
  id: true,
  nome: true,
  email: true,
  grupoAtivoId: true,
  senhaAlteradaEm: true,
} satisfies Prisma.UsuarioSelect;

export type UsuarioAtual = Prisma.UsuarioGetPayload<{ select: typeof SELECT_USUARIO_ATUAL }>;

/** Id numérico da sessão, ou `null` se ausente ou malformado. */
export function idDaSessao(sessao: DadosSessao | null | undefined): number | null {
  const id = Number(sessao?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** A sessão é anterior à última redefinição de senha? */
export function sessaoAnteriorASenha(
  usuario: { senhaAlteradaEm: Date | null },
  sessao: DadosSessao | null | undefined,
): boolean {
  if (!usuario.senhaAlteradaEm) return false;
  return (sessao?.emitidoEm ?? 0) < usuario.senhaAlteradaEm.getTime();
}

/** Devolve a conta da sessão se ela ainda vale, ou `null`. */
export async function conferirSessao(sessao: DadosSessao | null | undefined): Promise<UsuarioAtual | null> {
  const id = idDaSessao(sessao);
  if (id === null) return null;

  const usuario = await prisma.usuario.findUnique({ where: { id }, select: SELECT_USUARIO_ATUAL });
  if (!usuario || sessaoAnteriorASenha(usuario, sessao)) return null;
  return usuario;
}

/** Para Server Components e Server Actions: devolve a conta ou leva a /login. */
export async function getUsuarioAtual(): Promise<UsuarioAtual> {
  const sessao = await auth();
  const usuario = await conferirSessao(sessao?.user);
  if (!usuario) redirect(ROTA_LOGIN);
  return usuario;
}
