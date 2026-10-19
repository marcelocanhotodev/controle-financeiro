// Schema Zod do cadastro pela tela "Criar conta" (capability: autenticacao,
// Requirements "Cadastro de conta" e "Entrada em grupo durante o cadastro").
// Usado no formulário e na Server Action — nunca confiar só no cliente.
//
// Sem campo `id`: o id é sempre gerado pelo banco.

import { z } from "zod";

export const MENSAGEM_SENHA_CURTA = "A senha precisa ter pelo menos 8 caracteres.";
export const MENSAGEM_EMAIL_JA_CADASTRADO = "Este e-mail já tem conta. Use a opção Entrar.";
export { MENSAGEM_CODIGO_INEXISTENTE } from "@/lib/validators/grupo";

export const cadastroSchema = z.object({
  nome: z.string({ required_error: "Informe seu nome." }).trim().min(1, "Informe seu nome."),
  email: z
    .string({ required_error: "Informe um e-mail válido." })
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido."),
  senha: z.string({ required_error: MENSAGEM_SENHA_CURTA }).min(8, MENSAGEM_SENHA_CURTA),
  // Opcional: vazio cria "Grupo de <primeiro nome>".
  codigoGrupo: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((codigo) => codigo || undefined),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type CampoCadastro = keyof CadastroInput;
