// Extensão de tipos da sessão e do JWT do Auth.js. Ver src/lib/auth.config.ts,
// src/lib/sessao-token.ts e src/lib/usuario-atual.ts.

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      /** Usuario.id como string (convenção do Auth.js). */
      id: string;
      email: string;
      name?: string | null;
      /** Copiado do JWT (ver abaixo); conferido por getUsuarioAtual(). */
      emitidoEm?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    /** Momento do login, em ms. Gravado só quando a sessão é criada, nunca
     * na renovação — base da queda das sessões ao redefinir a senha. */
    emitidoEm?: number;
  }
}
