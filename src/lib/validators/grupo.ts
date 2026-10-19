// Schemas e mensagens das ações de grupo (capability: grupos). Sem campo `id`:
// ids são sempre gerados pelo banco, e um `id` enviado pelo cliente é
// descartado pelo Zod.

import { z } from "zod";

export const MENSAGEM_CODIGO_INEXISTENTE = "Não encontramos nenhum grupo com este código.";
export const MENSAGEM_JA_PARTICIPA = "Você já participa deste grupo.";
/** Mesma resposta para grupo inexistente e para grupo de outra pessoa. */
export const MENSAGEM_GRUPO_NAO_ENCONTRADO = "Grupo não encontrado.";
export const MENSAGEM_MEMBRO_NAO_ENCONTRADO = "Membro não encontrado.";
export const MENSAGEM_NAO_REMOVE_A_SI = "Para sair do grupo, use \"Sair deste grupo\".";

export const criarGrupoSchema = z.object({
  nome: z.string({ required_error: "Dê um nome ao grupo." }).trim().min(1, "Dê um nome ao grupo."),
});

export const entrarPorCodigoSchema = z.object({
  codigo: z
    .string({ required_error: "Informe o código do grupo." })
    .trim()
    .toUpperCase()
    .min(1, "Informe o código do grupo."),
});

export const idGrupoSchema = z.coerce.number().int().positive();
export const idUsuarioSchema = z.coerce.number().int().positive();
