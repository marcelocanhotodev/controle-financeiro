"use server";

// Server Actions de grupo (capability: grupos). Cada ação confere a sessão de
// novo (getUsuarioAtual / getGrupoAtual / exigirAdmin), nunca confia na
// página, valida com Zod e devolve { ok, erro?, mensagem? }. Ver design.md,
// "Server Actions".

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { comCodigoUnico } from "@/lib/codigo-grupo";
import { getGrupoAtual, SemGrupoAtivoError } from "@/lib/grupo-atual";
import { escolherGrupoAtivo } from "@/lib/grupo-selecao";
import { adminOuRecusa } from "@/lib/rbac";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import {
  criarGrupoSchema,
  entrarPorCodigoSchema,
  idGrupoSchema,
  idUsuarioSchema,
  MENSAGEM_CODIGO_INEXISTENTE,
  MENSAGEM_GRUPO_NAO_ENCONTRADO,
  MENSAGEM_JA_PARTICIPA,
  MENSAGEM_MEMBRO_NAO_ENCONTRADO,
  MENSAGEM_NAO_REMOVE_A_SI,
} from "@/lib/validators/grupo";

export interface AcaoGrupoResultado {
  ok: boolean;
  erro?: string;
  /** Aviso de retorno para a tela. */
  mensagem?: string;
}

/** Cria um grupo com a pessoa como Administradora; ele vira o grupo ativo. */
export async function criarGrupo(dadosBrutos: unknown): Promise<AcaoGrupoResultado> {
  const usuario = await getUsuarioAtual();
  const parse = criarGrupoSchema.safeParse(dadosBrutos);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? "Dê um nome ao grupo." };
  const { nome } = parse.data;

  await comCodigoUnico(nome, (codigo) =>
    prisma.$transaction(async (tx) => {
      const grupo = await tx.grupo.create({ data: { nome, codigo } });
      await tx.participacao.create({ data: { usuarioId: usuario.id, grupoId: grupo.id, papel: "ADMIN" } });
      await tx.usuario.update({ where: { id: usuario.id }, data: { grupoAtivoId: grupo.id } });
    }),
  );

  revalidatePath("/", "layout");
  return { ok: true, mensagem: `Grupo "${nome}" criado.` };
}

/** Entra como Membro no grupo do código (sem diferenciar maiúsculas); ele
 * vira o grupo ativo. O id do grupo nunca serve para entrar. */
export async function entrarPorCodigo(dadosBrutos: unknown): Promise<AcaoGrupoResultado> {
  const usuario = await getUsuarioAtual();
  const parse = entrarPorCodigoSchema.safeParse(dadosBrutos);
  if (!parse.success) return { ok: false, erro: parse.error.issues[0]?.message ?? MENSAGEM_CODIGO_INEXISTENTE };

  const grupo = await prisma.grupo.findUnique({ where: { codigo: parse.data.codigo }, select: { id: true, nome: true } });
  if (!grupo) return { ok: false, erro: MENSAGEM_CODIGO_INEXISTENTE };

  const jaParticipa = await prisma.participacao.findUnique({
    where: { usuarioId_grupoId: { usuarioId: usuario.id, grupoId: grupo.id } },
  });
  if (jaParticipa) return { ok: false, erro: MENSAGEM_JA_PARTICIPA };

  try {
    await prisma.$transaction([
      prisma.participacao.create({ data: { usuarioId: usuario.id, grupoId: grupo.id, papel: "MEMBRO" } }),
      prisma.usuario.update({ where: { id: usuario.id }, data: { grupoAtivoId: grupo.id } }),
    ]);
  } catch (erro) {
    // Dois envios ao mesmo tempo: a chave (pessoa, grupo) recusa o segundo.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { ok: false, erro: MENSAGEM_JA_PARTICIPA };
    }
    throw erro;
  }

  revalidatePath("/", "layout");
  return { ok: true, mensagem: `Você entrou em "${grupo.nome}".` };
}

/** Torna ativo um grupo do qual a pessoa participa (vale para todos os
 * aparelhos dela). Grupo de que ela não participa responde como grupo
 * inexistente e nada muda. Depois, o seletor chama router.refresh(). */
export async function trocarGrupoAtivo(grupoIdBruto: unknown): Promise<AcaoGrupoResultado> {
  const usuario = await getUsuarioAtual();
  const parse = idGrupoSchema.safeParse(grupoIdBruto);
  if (!parse.success) return { ok: false, erro: MENSAGEM_GRUPO_NAO_ENCONTRADO };
  const grupoId = parse.data;

  const participacao = await prisma.participacao.findUnique({
    where: { usuarioId_grupoId: { usuarioId: usuario.id, grupoId } },
  });
  if (!participacao) return { ok: false, erro: MENSAGEM_GRUPO_NAO_ENCONTRADO };

  await prisma.usuario.update({ where: { id: usuario.id }, data: { grupoAtivoId: grupoId } });
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Administradora remove outro membro do grupo ativo. Não remove a si mesma
 * (para isso há "Sair deste grupo"). O acesso da pessoa removida cai na hora:
 * getGrupoAtual() confere a participação a cada ação e, na próxima, a leva a
 * outro grupo dela com o aviso — por isso o grupoAtivoId dela não é mexido.
 */
export async function removerMembro(usuarioIdBruto: unknown): Promise<AcaoGrupoResultado> {
  const admin = await adminOuRecusa();
  if (!admin.grupo) return { ok: false, erro: admin.erro };
  const { grupoId, usuario } = admin.grupo;

  const parse = idUsuarioSchema.safeParse(usuarioIdBruto);
  if (!parse.success) return { ok: false, erro: MENSAGEM_MEMBRO_NAO_ENCONTRADO };
  const alvoId = parse.data;
  if (alvoId === usuario.id) return { ok: false, erro: MENSAGEM_NAO_REMOVE_A_SI };

  const participacao = await prisma.participacao.findUnique({
    where: { usuarioId_grupoId: { usuarioId: alvoId, grupoId } },
    include: { usuario: { select: { nome: true } } },
  });
  if (!participacao) return { ok: false, erro: MENSAGEM_MEMBRO_NAO_ENCONTRADO };

  await prisma.participacao.deleteMany({ where: { usuarioId: alvoId, grupoId } });
  revalidatePath("/grupo");
  return { ok: true, mensagem: `${participacao.usuario.nome} saiu do grupo.` };
}

/**
 * A pessoa sai do grupo ativo. Na mesma transação: se não restar ninguém, o
 * grupo e os convites dele são excluídos; se restarem membros sem nenhum
 * Administrador, o mais antigo (menor entrouEm, usuarioId como desempate)
 * vira Administrador; e o grupo ativo da pessoa passa a ser outro grupo dela
 * pela mesma regra de getGrupoAtual() — sem o aviso de troca.
 */
export async function sairDoGrupo(): Promise<AcaoGrupoResultado> {
  let grupoAtual;
  try {
    grupoAtual = await getGrupoAtual();
  } catch (erro) {
    if (erro instanceof SemGrupoAtivoError) return { ok: false, erro: MENSAGEM_GRUPO_NAO_ENCONTRADO };
    throw erro;
  }
  const { grupoId, usuario } = grupoAtual;

  await prisma.$transaction(async (tx) => {
    await tx.participacao.delete({ where: { usuarioId_grupoId: { usuarioId: usuario.id, grupoId } } });

    const restantes = await tx.participacao.findMany({
      where: { grupoId },
      orderBy: [{ entrouEm: "asc" }, { usuarioId: "asc" }],
    });
    if (restantes.length === 0) {
      await tx.grupo.delete({ where: { id: grupoId } });
    } else if (!restantes.some((p) => p.papel === "ADMIN")) {
      await tx.participacao.update({
        where: { usuarioId_grupoId: { usuarioId: restantes[0].usuarioId, grupoId } },
        data: { papel: "ADMIN" },
      });
    }

    const minhas = await tx.participacao.findMany({
      where: { usuarioId: usuario.id },
      select: { grupoId: true, entrouEm: true },
    });
    await tx.usuario.update({ where: { id: usuario.id }, data: { grupoAtivoId: escolherGrupoAtivo(null, minhas) } });
  });

  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Você saiu do grupo." };
}
