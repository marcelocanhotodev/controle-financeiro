"use client";

// "Esqueci minha senha" (capability autenticacao, Requirement "Recuperação de
// senha"): pede o e-mail e mostra sempre a mesma resposta, exista ou não uma
// conta com ele.

import Link from "next/link";
import { useRef, useState } from "react";
import { Campo } from "@/components/campo";
import { pedirRedefinicaoSenha } from "@/lib/actions/senha";
import { useMontado } from "@/lib/hooks/use-montado";

export function FormularioEsqueciSenha() {
  const [erro, setErro] = useState<string | null>(null);
  const [resposta, setResposta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const montado = useMontado();
  const refEmail = useRef<HTMLInputElement>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setResposta(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const resultado = await pedirRedefinicaoSenha({ email: String(dados.get("email") ?? "") });
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Informe um e-mail válido.");
      refEmail.current?.focus();
      return;
    }
    setResposta(resultado.mensagem ?? null);
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h2>Esqueci minha senha</h2>
        <p className="text-suave">Informe o e-mail da sua conta. Enviaremos um link para você definir uma nova senha.</p>
      </div>
      <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
        <Campo rotulo="E-mail" erro={erro ?? undefined}>
          {(props) => (
            <input ref={refEmail} type="email" name="email" autoComplete="email" placeholder="voce@email.com" {...props} />
          )}
        </Campo>
        <div role="status" aria-live="polite">
          {resposta && (
            <p className="rounded-lg bg-entrada-suave px-3 py-[9px] text-[0.88rem] font-medium text-entrada">{resposta}</p>
          )}
        </div>
        <button type="submit" className="botao w-full" disabled={enviando || !montado}>
          Enviar link
        </button>
      </form>
      <Link href="/login" className="self-start text-sm font-semibold text-destaque underline">
        Voltar para entrar
      </Link>
    </>
  );
}
