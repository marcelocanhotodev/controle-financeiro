// Schemas e mensagens dos convites (capability: grupos, Requirements "Convite
// por e-mail", "Aceite de convite" e "Gestão de convites pendentes").

import { z } from "zod";

export const MENSAGEM_JA_MEMBRO = "Esta pessoa já faz parte do grupo.";
export const MENSAGEM_CONVITE_NAO_ENCONTRADO = "Convite não encontrado.";
export const MENSAGEM_CONVITE_INVALIDO =
  "Este convite não é mais válido. Peça um novo convite a quem administra o grupo.";
export const MENSAGEM_CONVITE_OUTRO_EMAIL = "Este convite é para outro e-mail.";
export const MENSAGEM_FALHA_ENVIO =
  "O convite foi registrado, mas o e-mail não pôde ser enviado. Você pode reenviar pela lista de membros.";

/** Só o e-mail: o Administrador nunca define a senha de ninguém. */
export const convidarSchema = z.object({
  email: z
    .string({ required_error: "Informe um e-mail válido." })
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido."),
});

export const idConviteSchema = z.coerce.number().int().positive();
