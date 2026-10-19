"use client";

import { signOut } from "next-auth/react";

// Capability autenticacao, Requirement "Sessão e logout": signOut() apaga o
// cookie de sessão e leva à tela de login.
export function BotaoSair() {
  return (
    <button type="button" className="botao botao-fantasma botao-pequeno" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sair
    </button>
  );
}
