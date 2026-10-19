"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAviso } from "@/components/aviso";
import { aceitarConvite } from "@/lib/actions/convite";
import { useMontado } from "@/lib/hooks/use-montado";

// Botões da página do convite (capability grupos, Requirement "Aceite de
// convite").

export function BotaoAceitarConvite({ token }: { token: string }) {
  const router = useRouter();
  const avisar = useAviso();
  const montado = useMontado();
  const [erro, setErro] = useState<string | null>(null);
  const [aceitando, iniciar] = useTransition();

  function aceitar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await aceitarConvite(token);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível aceitar o convite.");
        return;
      }
      if (resultado.mensagem) avisar(resultado.mensagem);
      router.push("/resumo");
      router.refresh();
    });
  }

  return (
    <>
      {erro && (
        <p role="alert" className="rounded-lg bg-saida-suave px-3 py-[9px] font-medium text-saida">
          {erro}
        </p>
      )}
      <button type="button" className="botao self-start" onClick={aceitar} disabled={aceitando || !montado}>
        Entrar no grupo
      </button>
    </>
  );
}

/** Autenticado com outro e-mail: sai e volta ao login, que depois retorna ao convite. */
export function BotaoSairParaTrocarConta({ retorno }: { retorno: string }) {
  return (
    <button
      type="button"
      className="botao botao-fantasma self-start"
      onClick={() => signOut({ callbackUrl: `/login?retorno=${encodeURIComponent(retorno)}` })}
    >
      Sair para entrar com a conta certa
    </button>
  );
}
