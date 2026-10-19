// ============================================================================
// Config completa do Auth.js (Node runtime): provider de credenciais e
// callback `jwt`. Usado pela route handler /api/auth/[...nextauth] e por
// Server Components/Actions — nunca pelo middleware (ver auth.config.ts).
//
// Capability: autenticacao. Ver openspec/changes/usuarios-e-grupos/design.md,
// "Auth.js v5 com Credentials, bcrypt e sessão JWT".
// ============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/lib/auth.config";
import { verificarCredenciais } from "@/lib/credenciais";
import { montarTokenSessao } from "@/lib/sessao-token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: (credentials) => verificarCredenciais(credentials?.email, credentials?.senha),
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      return montarTokenSessao(token, user);
    },
  },
});
