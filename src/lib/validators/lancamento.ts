// Schema Zod do novo lançamento (capability: lancamentos, Requirement
// "Registro de lançamento"). Usado na Server Action — nunca confiar só no
// formulário.
//
// Sem `id`, `autorId` nem `grupoId`: o Zod descarta o que vier do cliente; o
// autor vem da sessão e o grupo de getGrupoAtual() (Requirement "Autoria dos
// lançamentos").

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { categoriaValida } from "@/lib/categorias";
import { lerValor, VALOR_MAXIMO } from "@/lib/format/moeda";
import { paraDiaCalendarioDeChave, type DiaCalendario } from "@/lib/timezone";

export const MENSAGEM_DESCRICAO = "Descreva o lançamento.";
export const MENSAGEM_VALOR = "Informe um valor maior que zero, como 125,90.";
export const MENSAGEM_VALOR_MAXIMO = "O valor máximo de um lançamento é R$ 99.999.999,99.";
export const MENSAGEM_CATEGORIA = "Escolha uma categoria.";
export const MENSAGEM_DATA = "Escolha a data.";

export type CampoLancamento = "descricao" | "valor" | "categoria" | "data";

export const novoLancamentoSchema = z
  .object({
    tipo: z.enum(["ENTRADA", "SAIDA"], { errorMap: () => ({ message: "Escolha Entrada ou Saída." }) }),
    descricao: z.string({ required_error: MENSAGEM_DESCRICAO }).trim().min(1, MENSAGEM_DESCRICAO).max(120),
    valor: z.string({ required_error: MENSAGEM_VALOR }),
    categoria: z.string({ required_error: MENSAGEM_CATEGORIA }),
    data: z.string({ required_error: MENSAGEM_DATA }),
  })
  .transform((dados, ctx) => {
    const valor = lerValor(dados.valor);
    if (!valor || valor.lessThanOrEqualTo(0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: MENSAGEM_VALOR });
    } else if (valor.greaterThan(VALOR_MAXIMO)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: MENSAGEM_VALOR_MAXIMO });
    }
    if (!categoriaValida(dados.tipo, dados.categoria)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categoria"], message: MENSAGEM_CATEGORIA });
    }
    const dia = paraDiaCalendarioDeChave(dados.data);
    if (!dia) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data"], message: MENSAGEM_DATA });
    if (!valor || !dia) return z.NEVER;
    return { tipo: dados.tipo, descricao: dados.descricao, categoria: dados.categoria, valor, dia };
  });

export interface NovoLancamento {
  tipo: "ENTRADA" | "SAIDA";
  descricao: string;
  categoria: string;
  valor: Prisma.Decimal;
  dia: DiaCalendario;
}

/** Valida e devolve o lançamento, ou o primeiro problema na ordem dos campos
 * do formulário (para o foco ir até ele). */
export function validarNovoLancamento(
  dadosBrutos: unknown,
): { ok: true; dados: NovoLancamento } | { ok: false; campo?: CampoLancamento; erro: string } {
  const parse = novoLancamentoSchema.safeParse(dadosBrutos);
  if (parse.success) return { ok: true, dados: parse.data };

  const ordem: CampoLancamento[] = ["descricao", "valor", "categoria", "data"];
  const problemas = parse.error.issues;
  for (const campo of ordem) {
    const problema = problemas.find((p) => p.path[0] === campo);
    if (problema) return { ok: false, campo, erro: problema.message };
  }
  return { ok: false, erro: problemas[0]?.message ?? "Dados inválidos." };
}
