// Conferência de e-mail e senha usada pelo `authorize()` do Credentials
// provider (src/lib/auth.ts). Fica fora de auth.ts para poder ser testada sem
// subir o Auth.js.

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export interface UsuarioAutenticado {
  id: string;
  email: string;
  name: string;
}

/** E-mail é sempre gravado e comparado em minúsculas, sem espaços nas pontas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Devolve o usuário quando e-mail e senha conferem, ou `null`. A resposta é a
 * mesma (null) para e-mail inexistente e para senha errada — spec
 * `autenticacao`, Scenario "Credenciais incorretas".
 */
export async function verificarCredenciais(email: unknown, senha: unknown): Promise<UsuarioAutenticado | null> {
  if (typeof email !== "string" || typeof senha !== "string" || !email || !senha) return null;

  const usuario = await prisma.usuario.findUnique({ where: { email: normalizarEmail(email) } });
  if (!usuario) return null;

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) return null;

  // usuario.id é Int (PK); a sessão do Auth.js guarda ids como string. A
  // conversão de volta para number acontece só em src/lib/usuario-atual.ts.
  return { id: String(usuario.id), email: usuario.email, name: usuario.nome };
}
