"use client";

// "Convidar pessoas" (capability grupos, Requirements "Código do grupo" e
// "Convite por e-mail"): só para Administradores. Código com "Copiar" e,
// quando o navegador não deixa copiar, o plano B do protótipo — seleciona o
// texto e pede para copiar à mão.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso";
import { Campo, CLASSE_CONTROLE } from "@/components/campo";
import { convidar } from "@/lib/actions/convite";
import { useMontado } from "@/lib/hooks/use-montado";

export function PainelConvite({ codigo }: { codigo: string }) {
  const router = useRouter();
  const avisar = useAviso();
  const montado = useMontado();
  const refCodigo = useRef<HTMLInputElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function copiar() {
    const selecionarParaCopiar = () => {
      refCodigo.current?.select();
      avisar("Selecione e copie o código.");
    };
    if (!navigator.clipboard?.writeText) return selecionarParaCopiar();
    try {
      await navigator.clipboard.writeText(codigo);
      avisar("Código copiado.");
    } catch {
      selecionarParaCopiar();
    }
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    setErro(null);
    setEnviando(true);
    const resultado = await convidar({ email: String(new FormData(formulario).get("email") ?? "") });
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível convidar.");
      refEmail.current?.focus();
      return;
    }
    if (resultado.mensagem) avisar(resultado.mensagem);
    formulario.reset();
    router.refresh();
  }

  return (
    <section className="quadro flex flex-col gap-5" aria-labelledby="titulo-convidar">
      <div>
        <h2 id="titulo-convidar">Convidar pessoas</h2>
        <p className="mb-3.5 text-[0.88rem] text-suave">Compartilhe o código ou convide por e-mail.</p>
        <div className="flex flex-col gap-1.5">
          <span className="rotulo">Código deste grupo</span>
          <div className="flex gap-2">
            <input
              ref={refCodigo}
              type="text"
              readOnly
              value={codigo}
              aria-label="Código deste grupo"
              className={`${CLASSE_CONTROLE} num`}
            />
            <button type="button" className="botao botao-fantasma" onClick={copiar}>
              Copiar
            </button>
          </div>
        </div>
      </div>
      <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
        <Campo rotulo="Convidar por e-mail" erro={erro ?? undefined}>
          {(props) => (
            <input
              ref={refEmail}
              type="email"
              name="email"
              autoComplete="off"
              placeholder="pessoa@email.com"
              {...props}
            />
          )}
        </Campo>
        <button type="submit" className="botao self-start" disabled={enviando || !montado}>
          Convidar
        </button>
      </form>
    </section>
  );
}
