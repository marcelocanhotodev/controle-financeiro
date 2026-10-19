// ============================================================================
// Papéis por grupo (capability: grupos, Requirement "Papéis e permissões").
// Mesmo padrão de src/lib/rbac.ts do matilha-app: uma função central, usada
// em duas camadas — a página (o que aparece) E toda Server Action de
// Administrador (nunca confiar só na página).
// ============================================================================

import { getGrupoAtual, SemGrupoAtivoError, type GrupoAtual } from "@/lib/grupo-atual";

export class NaoAutorizadoError extends Error {
  constructor() {
    super("A pessoa não é Administradora do grupo ativo.");
    this.name = "NaoAutorizadoError";
  }
}

/** O grupo ativo, se a pessoa for Administradora dele. Lança
 * SemGrupoAtivoError sem grupo e NaoAutorizadoError para Membro comum. */
export async function exigirAdmin(): Promise<GrupoAtual> {
  const grupo = await getGrupoAtual();
  if (grupo.papel !== "ADMIN") throw new NaoAutorizadoError();
  return grupo;
}

export const MENSAGEM_SO_ADMIN = "Somente quem administra o grupo pode fazer isso.";

/** Para Server Actions: o grupo ativo se a pessoa for Administradora, ou a
 * mensagem de recusa (Membro comum ou sem grupo) para devolver como
 * `{ ok: false, erro }` — nada é alterado. */
export async function adminOuRecusa(): Promise<{ grupo: GrupoAtual; erro?: undefined } | { grupo?: undefined; erro: string }> {
  try {
    return { grupo: await exigirAdmin() };
  } catch (erro) {
    if (erro instanceof NaoAutorizadoError || erro instanceof SemGrupoAtivoError) return { erro: MENSAGEM_SO_ADMIN };
    throw erro;
  }
}
