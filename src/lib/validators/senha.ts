// Schemas e mensagens do link de definir senha (capability: autenticacao,
// Requirements "Recuperação de senha" e "Link de definir senha").

import { z } from "zod";
import { MENSAGEM_SENHA_CURTA } from "@/lib/validators/cadastro";

export const MENSAGEM_PEDIDO_REDEFINICAO = "Se houver uma conta com este e-mail, enviamos um link.";
export const MENSAGEM_LINK_INVALIDO = "Este link não é mais válido.";
export const MENSAGEM_EMAIL_JA_TEM_CONTA_CONVITE = "Este e-mail já tem conta. Entre para aceitar o convite.";

export const pedirRedefinicaoSchema = z.object({
  email: z
    .string({ required_error: "Informe um e-mail válido." })
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido."),
});

/** REDEFINIR: só a nova senha. */
export const novaSenhaSchema = z.object({
  senha: z.string({ required_error: MENSAGEM_SENHA_CURTA }).min(8, MENSAGEM_SENHA_CURTA),
});

/** CRIAR: nome e senha. Sem `email` de propósito — o e-mail vem do convite. */
export const criarContaPorConviteSchema = novaSenhaSchema.extend({
  nome: z.string({ required_error: "Informe seu nome." }).trim().min(1, "Informe seu nome."),
});
