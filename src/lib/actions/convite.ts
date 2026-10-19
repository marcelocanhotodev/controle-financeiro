"use server";

// Server Actions de convite (capability: grupos). Convidar, reenviar e
// cancelar exigem Administrador do grupo ativo — conferido de novo em cada
// ação (adminOuRecusa), nunca só na página. Ver design.md, "Convite por link com token
// para todo mundo".
//
// O link do e-mail é decidido a cada envio: quem já tem conta recebe o link
// do convite (/convite/[token]); quem não tem recebe um link de definir senha
// (TokenSenha CRIAR, ligado ao convite) e cria a conta por ele. A resposta ao
// Administrador é a mesma nos dois casos.

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma, type Convite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buscarConvitePendente, filtroPendente } from "@/lib/convite-pendente";
import { enviarConvite } from "@/lib/email";
import { adminOuRecusa } from "@/lib/rbac";
import { criarTokenSenha, invalidarTokensDoConvite } from "@/lib/token-senha";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { MENSAGEM_JA_PARTICIPA } from "@/lib/validators/grupo";
import {
  convidarSchema,
  idConviteSchema,
  MENSAGEM_CONVITE_INVALIDO,
  MENSAGEM_CONVITE_NAO_ENCONTRADO,
  MENSAGEM_CONVITE_OUTRO_EMAIL,
  MENSAGEM_FALHA_ENVIO,
  MENSAGEM_JA_MEMBRO,
} from "@/lib/validators/convite";

const VALIDADE_CONVITE_MS = 7 * 24 * 60 * 60 * 1000;
const TAMANHO_MAXIMO_ERRO_ENVIO = 500;

export interface ConviteResultado {
  ok: boolean;
  erro?: string;
  /** Aviso de retorno para a tela. */
  mensagem?: string;
  /** Convite registrado, mas o e-mail não saiu. */
  envioFalhou?: boolean;
}

interface Remetente {
  nome: string;
  email: string;
}

/** Monta o link certo para o momento, envia e grava o resultado no convite —
 * uma falha nunca apaga o convite. Devolve o motivo da falha ou `null`. */
async function enviarERegistrar(convite: Convite, grupoNome: string, remetente: Remetente): Promise<string | null> {
  const temConta = (await prisma.usuario.count({ where: { email: convite.email } })) > 0;

  let link: string;
  if (temConta) {
    link = `${process.env.NEXTAUTH_URL}/convite/${convite.token}`;
  } else {
    // O valor puro do link anterior não fica guardado: o reenvio gera outro e
    // invalida o anterior.
    const valor = await prisma.$transaction(async (tx) => {
      await invalidarTokensDoConvite(convite.id, tx);
      return criarTokenSenha(
        { finalidade: "CRIAR", email: convite.email, conviteId: convite.id, expiraEm: convite.expiraEm },
        tx,
      );
    });
    link = `${process.env.NEXTAUTH_URL}/definir-senha/${valor}`;
  }

  let motivo: string | null = null;
  try {
    await enviarConvite({
      email: convite.email,
      grupoNome,
      convidadoPor: remetente.nome,
      replyTo: remetente.email,
      link,
      expiraEm: convite.expiraEm,
      criarConta: !temConta,
    });
  } catch (erro) {
    motivo = (erro instanceof Error ? erro.message : "Erro desconhecido ao enviar e-mail.").slice(
      0,
      TAMANHO_MAXIMO_ERRO_ENVIO,
    );
  }

  await prisma.convite.update({
    where: { id: convite.id },
    data: { envioStatus: motivo ? "FALHOU" : "ENVIADO", envioErro: motivo, envioEm: new Date() },
  });
  return motivo;
}

function resultadoDoEnvio(motivo: string | null, mensagemDeSucesso: string): ConviteResultado {
  return motivo ? { ok: true, envioFalhou: true, mensagem: MENSAGEM_FALHA_ENVIO } : { ok: true, mensagem: mensagemDeSucesso };
}

/** Convida um e-mail para o grupo ativo. Convite pendente para o mesmo
 * e-mail é reaproveitado e reenviado com nova validade de 7 dias. */
export async function convidar(dadosBrutos: unknown): Promise<ConviteResultado> {
  const admin = await adminOuRecusa();
  if (!admin.grupo) return { ok: false, erro: admin.erro };
  const { grupoId, grupoNome, usuario } = admin.grupo;

  const parse = convidarSchema.safeParse(dadosBrutos);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Informe um e-mail válido." };
  const { email } = parse.data;

  const jaMembro = await prisma.participacao.findFirst({ where: { grupoId, usuario: { email } } });
  if (jaMembro) return { ok: false, erro: MENSAGEM_JA_MEMBRO };

  const agora = new Date();
  const expiraEm = new Date(agora.getTime() + VALIDADE_CONVITE_MS);
  const existente = await prisma.convite.findFirst({ where: { grupoId, email, ...filtroPendente(agora) } });

  if (existente) {
    const convite = await prisma.convite.update({ where: { id: existente.id }, data: { expiraEm } });
    const motivo = await enviarERegistrar(convite, grupoNome, usuario);
    revalidatePath("/grupo");
    return resultadoDoEnvio(motivo, `Convite reenviado para ${email}.`);
  }

  const convite = await prisma.convite.create({
    data: { grupoId, email, token: randomBytes(32).toString("hex"), criadoPorId: usuario.id, expiraEm },
  });
  const motivo = await enviarERegistrar(convite, grupoNome, usuario);
  revalidatePath("/grupo");
  return resultadoDoEnvio(motivo, `Convite enviado para ${email}.`);
}

/** Reenvia um convite pendente do grupo ativo, com a validade de volta a 7
 * dias. Convite de outro grupo responde como inexistente. */
export async function reenviarConvite(conviteIdBruto: unknown): Promise<ConviteResultado> {
  const admin = await adminOuRecusa();
  if (!admin.grupo) return { ok: false, erro: admin.erro };
  const { grupoId, grupoNome, usuario } = admin.grupo;
  const parse = idConviteSchema.safeParse(conviteIdBruto);
  if (!parse.success) return { ok: false, erro: MENSAGEM_CONVITE_NAO_ENCONTRADO };

  const agora = new Date();
  const existente = await prisma.convite.findFirst({ where: { id: parse.data, grupoId, ...filtroPendente(agora) } });
  if (!existente) return { ok: false, erro: MENSAGEM_CONVITE_NAO_ENCONTRADO };

  const convite = await prisma.convite.update({
    where: { id: existente.id },
    data: { expiraEm: new Date(agora.getTime() + VALIDADE_CONVITE_MS) },
  });
  const motivo = await enviarERegistrar(convite, grupoNome, usuario);
  revalidatePath("/grupo");
  return resultadoDoEnvio(motivo, `Convite reenviado para ${convite.email}.`);
}

/** Cancela um convite ainda não aceito do grupo ativo. O link enviado —
 * de convite ou de definir senha (cascade) — deixa de funcionar. */
export async function cancelarConvite(conviteIdBruto: unknown): Promise<ConviteResultado> {
  const admin = await adminOuRecusa();
  if (!admin.grupo) return { ok: false, erro: admin.erro };
  const { grupoId } = admin.grupo;
  const parse = idConviteSchema.safeParse(conviteIdBruto);
  if (!parse.success) return { ok: false, erro: MENSAGEM_CONVITE_NAO_ENCONTRADO };

  const { count } = await prisma.convite.deleteMany({ where: { id: parse.data, grupoId, aceitoEm: null } });
  if (count === 0) return { ok: false, erro: MENSAGEM_CONVITE_NAO_ENCONTRADO };

  revalidatePath("/grupo");
  return { ok: true, mensagem: "Convite cancelado." };
}

class ConviteJaAceitoError extends Error {}

/**
 * Aceite pelo link do convite: exige sessão com o e-mail do convite. Em
 * transação, cria a participação como Membro, marca `aceitoEm` (só se ainda
 * estiver vazio — dois aceites ao mesmo tempo não duplicam nada), grava o
 * grupo como ativo e invalida os links de definir senha desse convite.
 */
export async function aceitarConvite(tokenBruto: unknown): Promise<ConviteResultado> {
  const usuario = await getUsuarioAtual();
  const convite = await buscarConvitePendente(String(tokenBruto ?? ""));
  if (!convite) return { ok: false, erro: MENSAGEM_CONVITE_INVALIDO };
  if (convite.email !== usuario.email) return { ok: false, erro: MENSAGEM_CONVITE_OUTRO_EMAIL };

  const jaParticipa = await prisma.participacao.findUnique({
    where: { usuarioId_grupoId: { usuarioId: usuario.id, grupoId: convite.grupoId } },
  });
  if (jaParticipa) return { ok: false, erro: MENSAGEM_JA_PARTICIPA };

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.convite.updateMany({
        where: { id: convite.id, aceitoEm: null },
        data: { aceitoEm: new Date() },
      });
      if (count !== 1) throw new ConviteJaAceitoError();
      await tx.participacao.create({ data: { usuarioId: usuario.id, grupoId: convite.grupoId, papel: "MEMBRO" } });
      await tx.usuario.update({ where: { id: usuario.id }, data: { grupoAtivoId: convite.grupoId } });
      await invalidarTokensDoConvite(convite.id, tx);
    });
  } catch (erro) {
    if (erro instanceof ConviteJaAceitoError) return { ok: false, erro: MENSAGEM_CONVITE_INVALIDO };
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, erro: MENSAGEM_JA_PARTICIPA };
    }
    throw erro;
  }

  revalidatePath("/", "layout");
  return { ok: true, mensagem: `Você entrou em "${convite.grupo.nome}".` };
}
