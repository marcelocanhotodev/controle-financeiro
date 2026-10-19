"use server";

// Server Actions de lançamento (capability: lancamentos). Toda ação começa por
// getGrupoAtual(), que confere no banco a participação no grupo ativo (a
// pessoa removida é recusada sem precisar sair e entrar), e todo id recebido
// do cliente entra junto do grupo: `where: { id, grupoId }`. Ver design.md,
// "Server Actions".

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatarReais } from "@/lib/format/moeda";
import { getGrupoAtual, SemGrupoAtivoError, type GrupoAtual } from "@/lib/grupo-atual";
import { paraChaveDeMes, paraDataDoBanco } from "@/lib/timezone";
import { validarNovoLancamento, type CampoLancamento } from "@/lib/validators/lancamento";

export interface LancamentoResultado {
  ok: boolean;
  erro?: string;
  /** Campo com problema, para o formulário mover o foco até ele. */
  campo?: CampoLancamento;
  /** Aviso de retorno para a tela. */
  mensagem?: string;
  /** Mês do lançamento criado (`yyyy-mm`), para a lista ir até ele. */
  mes?: string;
}

const MENSAGEM_SEM_GRUPO = "Você ainda não participa de nenhum grupo.";

/** O grupo ativo, ou `null` quando a pessoa não participa de nenhum. Sem
 * sessão válida, getGrupoAtual() leva a /login. */
async function grupoOuNull(): Promise<GrupoAtual | null> {
  try {
    return await getGrupoAtual();
  } catch (erro) {
    if (erro instanceof SemGrupoAtivoError) return null;
    throw erro;
  }
}

/** Registra uma entrada ou saída no grupo ativo, em nome de quem está na
 * sessão — autor, grupo e id enviados pelo cliente são ignorados. */
export async function criarLancamento(dadosBrutos: unknown): Promise<LancamentoResultado> {
  const grupo = await grupoOuNull();
  if (!grupo) return { ok: false, erro: MENSAGEM_SEM_GRUPO };

  const validacao = validarNovoLancamento(dadosBrutos);
  if (!validacao.ok) return { ok: false, erro: validacao.erro, campo: validacao.campo };
  const { tipo, descricao, valor, categoria, dia } = validacao.dados;

  await prisma.lancamento.create({
    data: {
      grupoId: grupo.grupoId,
      autorId: grupo.usuario.id,
      tipo,
      descricao,
      valor,
      categoria,
      data: paraDataDoBanco(dia),
    },
  });

  revalidatePath("/lancamentos");
  return {
    ok: true,
    mensagem: `${tipo === "ENTRADA" ? "Entrada" : "Saída"} de ${formatarReais(valor)} registrada.`,
    mes: paraChaveDeMes(dia),
  };
}

/** Prazo do servidor para desfazer: o aviso mostra "Desfazer" por 6 s, e a
 * folga cobre rede lenta. Depois disso, nada volta. */
const PRAZO_RESTAURAR_MS = 60_000;

const MENSAGEM_NAO_ENCONTRADO = "Lançamento não encontrado.";
const MENSAGEM_SEM_PERMISSAO = "Só quem registrou ou quem administra o grupo pode excluir este lançamento.";

/** Lançamento do grupo ativo que a pessoa pode excluir ou restaurar: o
 * autor, ou qualquer um se ela for Administradora. Id de outro grupo responde
 * igual a id inexistente. */
async function lancamentoPermitido(
  grupo: GrupoAtual,
  idBruto: unknown,
  where: Prisma.LancamentoWhereInput,
): Promise<{ id: number } | { erro: string }> {
  const id = Number(idBruto);
  if (!Number.isInteger(id) || id <= 0) return { erro: MENSAGEM_NAO_ENCONTRADO };

  const lancamento = await prisma.lancamento.findFirst({
    where: { id, grupoId: grupo.grupoId, ...where },
    select: { id: true, autorId: true },
  });
  if (!lancamento) return { erro: MENSAGEM_NAO_ENCONTRADO };
  if (lancamento.autorId !== grupo.usuario.id && grupo.papel !== "ADMIN") return { erro: MENSAGEM_SEM_PERMISSAO };
  return { id: lancamento.id };
}

/** Exclui (de forma reversível por 60 s) um lançamento do grupo ativo. */
export async function excluirLancamento(idBruto: unknown): Promise<LancamentoResultado> {
  const grupo = await grupoOuNull();
  if (!grupo) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADO };

  const alvo = await lancamentoPermitido(grupo, idBruto, { excluidoEm: null });
  if ("erro" in alvo) return { ok: false, erro: alvo.erro };

  await prisma.lancamento.updateMany({
    where: { id: alvo.id, grupoId: grupo.grupoId, excluidoEm: null },
    data: { excluidoEm: new Date() },
  });
  revalidatePath("/lancamentos");
  return { ok: true, mensagem: "Lançamento excluído." };
}

/** Desfaz a exclusão, só até 60 s depois dela. Depois do prazo, responde
 * como lançamento inexistente e nada muda. */
export async function restaurarLancamento(idBruto: unknown): Promise<LancamentoResultado> {
  const grupo = await grupoOuNull();
  if (!grupo) return { ok: false, erro: MENSAGEM_NAO_ENCONTRADO };

  const limite = new Date(Date.now() - PRAZO_RESTAURAR_MS);
  const alvo = await lancamentoPermitido(grupo, idBruto, { excluidoEm: { gt: limite } });
  if ("erro" in alvo) return { ok: false, erro: alvo.erro };

  await prisma.lancamento.updateMany({
    where: { id: alvo.id, grupoId: grupo.grupoId, excluidoEm: { gt: limite } },
    data: { excluidoEm: null },
  });
  revalidatePath("/lancamentos");
  return { ok: true };
}
