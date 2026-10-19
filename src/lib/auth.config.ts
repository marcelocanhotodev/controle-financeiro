// ============================================================================
// Config de Auth.js compartilhada entre src/lib/auth.ts (Node, route handler)
// e src/middleware.ts (Edge). Modelo: src/lib/auth.config.ts do matilha-app.
//
// REGRA: este arquivo NUNCA pode importar `bcryptjs` nem `@/lib/prisma` (nem
// nada que os importe transitivamente) — o Prisma Client usa APIs de Node que
// não existem no bundle de Edge, e isso quebra o middleware mesmo que o código
// nunca chegue a rodar lá. Provider e callback `jwt` vivem só em auth.ts.
// ============================================================================

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  // Fora da Vercel o Auth.js v5 não confia no header Host por padrão. O `true`
  // explícito evita depender da detecção automática; NEXTAUTH_URL já é
  // validada em src/lib/env.ts.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  // Preenchido em auth.ts — o Credentials provider precisa de bcrypt (Node).
  providers: [],
  callbacks: {
    // Só remonta a sessão a partir do token já decodificado, sem banco — por
    // isso é seguro em Edge. O grupo ativo NÃO vem do token: fica em
    // Usuario.grupoAtivoId (ver src/lib/grupo-atual.ts).
    async session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.email === "string") session.user.email = token.email;
      if (typeof token.emitidoEm === "number") session.user.emitidoEm = token.emitidoEm;
      return session;
    },
  },
};
