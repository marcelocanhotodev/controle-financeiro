// Consulta de convite pendente (capability: grupos). Fora de
// src/lib/actions/convite.ts de propósito: toda função exportada de um
// arquivo "use server" vira um endpoint que o navegador pode chamar.

import { prisma } from "@/lib/prisma";

/** Filtro de convite pendente: ainda não aceito e dentro da validade.
 * Convite cancelado não existe mais (é apagado). */
export function filtroPendente(agora: Date = new Date()) {
  return { aceitoEm: null, expiraEm: { gt: agora } };
}

/** Convite pelo token, se ainda vale, com o nome do grupo e de quem convidou. */
export async function buscarConvitePendente(token: string) {
  if (!token) return null;
  return prisma.convite.findFirst({
    where: { token, ...filtroPendente() },
    include: { grupo: { select: { nome: true } }, criadoPor: { select: { nome: true } } },
  });
}
