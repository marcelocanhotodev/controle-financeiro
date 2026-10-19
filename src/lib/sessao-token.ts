// Montagem do JWT da sessão (callback `jwt` de src/lib/auth.ts). Fica fora de
// auth.ts para poder ser testada sem subir o Auth.js.
//
// O token carrega só `id`, `email` e `emitidoEm` — nunca o grupo ativo (ver
// design.md, "Grupo ativo no banco").

import type { JWT } from "next-auth/jwt";

/**
 * `user` só vem preenchido no login (retorno de authorize()). É o único
 * momento em que `emitidoEm` é gravado: o Auth.js regrava o JWT a cada
 * renovação da sessão e troca o `iat` junto, então comparar a redefinição de
 * senha com o `iat` deixaria uma sessão antiga sobreviver (ver
 * src/lib/usuario-atual.ts).
 */
export function montarTokenSessao(
  token: JWT,
  user?: { id?: string | null; email?: string | null },
  agora: number = Date.now(),
): JWT {
  if (user?.id) {
    return { ...token, id: user.id, email: user.email ?? undefined, emitidoEm: agora };
  }
  return token;
}
