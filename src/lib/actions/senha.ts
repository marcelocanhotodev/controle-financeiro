"use server";

// Server Actions do link de definir senha (capability: autenticacao). Ver
// design.md, "Link de definir senha, único para criar conta e redefinir
// senha".

import bcrypt from "bcryptjs";
import { Prisma, type TokenSenha } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filtroPendente } from "@/lib/convite-pendente";
import { enviarRedefinicaoSenha } from "@/lib/email";
import { buscarTokenValido, consumirToken, criarTokenSenha, VALIDADE_REDEFINIR_MS } from "@/lib/token-senha";
import { MENSAGEM_SENHA_CURTA } from "@/lib/validators/cadastro";
import {
  criarContaPorConviteSchema,
  MENSAGEM_EMAIL_JA_TEM_CONTA_CONVITE,
  MENSAGEM_LINK_INVALIDO,
  MENSAGEM_PEDIDO_REDEFINICAO,
  novaSenhaSchema,
  pedirRedefinicaoSchema,
} from "@/lib/validators/senha";

/** Intervalo mínimo entre dois pedidos de redefinição da mesma conta. */
const INTERVALO_MINIMO_PEDIDO_MS = 60_000;

export interface PedidoRedefinicaoResultado {
  ok: boolean;
  /** Sempre a mesma mensagem quando `ok`, exista ou não a conta. */
  mensagem?: string;
  erro?: string;
}

/**
 * "Esqueci minha senha": se houver conta com o e-mail, cria um link REDEFINIR
 * de 1 hora e o envia — no máximo um pedido a cada 60 s por conta. A resposta
 * é a mesma exista ou não a conta, e também quando o envio falha (a falha só
 * vai para o log).
 */
export async function pedirRedefinicaoSenha(dadosBrutos: unknown): Promise<PedidoRedefinicaoResultado> {
  const parse = pedirRedefinicaoSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Informe um e-mail válido." };
  }
  const { email } = parse.data;
  const resposta: PedidoRedefinicaoResultado = { ok: true, mensagem: MENSAGEM_PEDIDO_REDEFINICAO };

  const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nome: true } });
  if (!usuario) return resposta;

  const agora = Date.now();
  const pedidoRecente = await prisma.tokenSenha.findFirst({
    where: {
      finalidade: "REDEFINIR",
      usuarioId: usuario.id,
      criadoEm: { gt: new Date(agora - INTERVALO_MINIMO_PEDIDO_MS) },
    },
    select: { id: true },
  });
  if (pedidoRecente) return resposta;

  const valor = await criarTokenSenha({
    finalidade: "REDEFINIR",
    email,
    usuarioId: usuario.id,
    expiraEm: new Date(agora + VALIDADE_REDEFINIR_MS),
  });

  try {
    await enviarRedefinicaoSenha({ email, nome: usuario.nome, link: `${process.env.NEXTAUTH_URL}/definir-senha/${valor}` });
  } catch (erro) {
    console.error(`[senha] Falha ao enviar o link de redefinição (usuário ${usuario.id}):`, erro);
  }
  return resposta;
}

export interface DefinirSenhaResultado {
  ok: boolean;
  erro?: string;
  /** Campo com problema (CRIAR), para o formulário mover o foco até ele. */
  campo?: "nome" | "senha";
  /** Link inválido (usado, vencido, inexistente ou do convite cancelado): a
   * tela troca o formulário pela mensagem de link inválido. */
  linkInvalido?: boolean;
  /** CRIAR: o e-mail ganhou conta depois do envio. A tela leva ao login,
   * que volta para este caminho (o link do convite). */
  entrarPara?: string;
  /** E-mail da conta, para o formulário entrar com a senha. */
  email?: string;
}

class TokenJaUsadoError extends Error {}

const LINK_INVALIDO: DefinirSenhaResultado = { ok: false, linkInvalido: true, erro: MENSAGEM_LINK_INVALIDO };

/**
 * Usa um link de definir senha. Depois de ok, o formulário chama signIn() com
 * o e-mail devolvido.
 *   - REDEFINIR: grava a nova senha e `senhaAlteradaEm` (as sessões emitidas
 *     antes caem — ver src/lib/usuario-atual.ts).
 *   - CRIAR: cria a conta da pessoa convidada com o e-mail do convite (nunca
 *     um e-mail vindo do cliente) e a torna Membro do grupo, já ativo.
 * Tudo numa transação que também consome o token.
 */
export async function definirSenha(valorToken: string, dadosBrutos: unknown): Promise<DefinirSenhaResultado> {
  const token = await buscarTokenValido(String(valorToken ?? ""));
  if (!token) return LINK_INVALIDO;

  try {
    if (token.finalidade === "REDEFINIR") return await redefinir(token, dadosBrutos);
    return await criarContaPorConvite(token, dadosBrutos);
  } catch (erro) {
    if (erro instanceof TokenJaUsadoError) return LINK_INVALIDO;
    throw erro;
  }
}

async function redefinir(token: TokenSenha, dadosBrutos: unknown): Promise<DefinirSenhaResultado> {
  const usuarioId = token.usuarioId;
  if (usuarioId === null) return LINK_INVALIDO;

  const parse = novaSenhaSchema.safeParse(dadosBrutos);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? MENSAGEM_SENHA_CURTA };

  const senhaHash = await bcrypt.hash(parse.data.senha, 10);
  const usuario = await prisma.$transaction(async (tx) => {
    if (!(await consumirToken(token, tx))) throw new TokenJaUsadoError();
    return tx.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash, senhaAlteradaEm: new Date() },
      select: { email: true },
    });
  });
  return { ok: true, email: usuario.email };
}

async function criarContaPorConvite(token: TokenSenha, dadosBrutos: unknown): Promise<DefinirSenhaResultado> {
  const convite = token.conviteId
    ? await prisma.convite.findFirst({ where: { id: token.conviteId, ...filtroPendente() } })
    : null;
  if (!convite) return LINK_INVALIDO;

  // Corrida: a pessoa criou conta pela tela "Criar conta" depois do envio.
  if ((await prisma.usuario.count({ where: { email: convite.email } })) > 0) {
    return { ok: false, erro: MENSAGEM_EMAIL_JA_TEM_CONTA_CONVITE, entrarPara: `/convite/${convite.token}` };
  }

  // O schema não tem `email`: um e-mail enviado pelo cliente é descartado.
  const parse = criarContaPorConviteSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    const problema = parse.error.issues[0];
    return { ok: false, erro: problema?.message, campo: problema?.path[0] as "nome" | "senha" };
  }
  const { nome, senha } = parse.data;
  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    await prisma.$transaction(async (tx) => {
      if (!(await consumirToken(token, tx))) throw new TokenJaUsadoError();
      const { count } = await tx.convite.updateMany({
        where: { id: convite.id, aceitoEm: null },
        data: { aceitoEm: new Date() },
      });
      if (count !== 1) throw new TokenJaUsadoError();
      const usuario = await tx.usuario.create({
        data: { nome, email: convite.email, senhaHash, grupoAtivoId: convite.grupoId },
      });
      await tx.participacao.create({ data: { usuarioId: usuario.id, grupoId: convite.grupoId, papel: "MEMBRO" } });
    });
  } catch (erro) {
    // A conta foi criada por outro caminho no meio do caminho.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, erro: MENSAGEM_EMAIL_JA_TEM_CONTA_CONVITE, entrarPara: `/convite/${convite.token}` };
    }
    throw erro;
  }
  return { ok: true, email: convite.email };
}
