// Middleware de autenticação (capability: autenticacao). Modelo:
// src/middleware.ts do matilha-app.
//
// Roda em Edge runtime — por isso usa só authConfig (sem providers, bcrypt
// nem Prisma, ver src/lib/auth.config.ts). A decisão vive em
// src/lib/rotas-protegidas.ts, pura e testável: sem sessão, qualquer página
// interna leva a /login.

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { decidirRedirecionamento } from "@/lib/rotas-protegidas";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const destino = decidirRedirecionamento({
    pathname: req.nextUrl.pathname,
    autenticado: Boolean(req.auth),
  });

  if (destino) {
    return NextResponse.redirect(new URL(destino, req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Fora do middleware: rotas de API (o Auth.js e as actions conferem a
  // sessão por conta própria), arquivos do Next e os arquivos do PWA, que
  // precisam carregar antes do login.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icones).*)"],
};
