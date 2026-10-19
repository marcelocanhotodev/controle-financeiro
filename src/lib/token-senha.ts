// ============================================================================
// Link de definir senha (capability: autenticacao, Requirement "Link de
// definir senha"). Um mesmo tipo de link para dois usos:
//   - CRIAR: a pessoa convidada sem conta cria a conta (ligado ao convite);
//   - REDEFINIR: "Esqueci minha senha" (ligado à conta).
//
// O valor do link são 32 bytes aleatórios. O banco guarda só o sha256
// (`tokenHash`); o valor puro existe apenas no e-mail. Ver design.md, "Link de
// definir senha, único para criar conta e redefinir senha".
// ============================================================================

import { createHash, randomBytes } from "crypto";
import type { FinalidadeTokenSenha, Prisma, TokenSenha } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient;

export const VALIDADE_REDEFINIR_MS = 60 * 60 * 1000; // 1 hora

export function hashToken(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export interface NovoTokenSenha {
  finalidade: FinalidadeTokenSenha;
  email: string;
  usuarioId?: number;
  conviteId?: number;
  expiraEm: Date;
}

/** Cria o token e devolve o valor puro, que só deve ir para o e-mail. */
export async function criarTokenSenha(dados: NovoTokenSenha, db: Db = prisma): Promise<string> {
  const valor = randomBytes(32).toString("hex");
  await db.tokenSenha.create({ data: { ...dados, tokenHash: hashToken(valor) } });
  return valor;
}

/** Token pelo valor do link, válido ou não — a página usa a finalidade de um
 * link vencido para oferecer a saída certa. */
export async function buscarToken(valor: string, db: Db = prisma): Promise<TokenSenha | null> {
  if (!valor) return null;
  return db.tokenSenha.findUnique({ where: { tokenHash: hashToken(valor) } });
}

export function tokenUtilizavel(token: TokenSenha, agora: Date = new Date()): boolean {
  return !token.usadoEm && token.expiraEm > agora;
}

/** Token que ainda pode ser usado: existe, não foi usado e não venceu. */
export async function buscarTokenValido(
  valor: string,
  agora: Date = new Date(),
  db: Db = prisma,
): Promise<TokenSenha | null> {
  const token = await buscarToken(valor, db);
  return token && tokenUtilizavel(token, agora) ? token : null;
}

/**
 * Marca o token como usado. Devolve `false` se outro pedido o usou primeiro
 * (a marcação só acontece se `usadoEm` ainda estiver vazio). Usar um
 * REDEFINIR invalida os outros REDEFINIR pendentes da conta. Os CRIAR são por
 * convite e não afetam os de outros convites.
 */
export async function consumirToken(token: TokenSenha, db: Db, agora: Date = new Date()): Promise<boolean> {
  const { count } = await db.tokenSenha.updateMany({
    where: { id: token.id, usadoEm: null },
    data: { usadoEm: agora },
  });
  if (count !== 1) return false;

  if (token.finalidade === "REDEFINIR" && token.usuarioId !== null) {
    await db.tokenSenha.updateMany({
      where: { finalidade: "REDEFINIR", usuarioId: token.usuarioId, usadoEm: null },
      data: { usadoEm: agora },
    });
  }
  return true;
}

/** Invalida os CRIAR pendentes de um convite (usado no reenvio, que gera um
 * link novo porque o valor puro do anterior não fica guardado). */
export async function invalidarTokensDoConvite(conviteId: number, db: Db = prisma, agora: Date = new Date()) {
  await db.tokenSenha.updateMany({
    where: { conviteId, finalidade: "CRIAR", usadoEm: null },
    data: { usadoEm: agora },
  });
}
