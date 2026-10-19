"use client";

import { useEffect, useRef, useState } from "react";

// Ação destrutiva em dois toques, como o `.btn.danger` / `.armed` do
// protótipo (capability grupos, Scenarios "Remover com confirmação",
// "Cancelar a confirmação" e "Sair com confirmação"): o primeiro toque troca
// o rótulo para o de confirmação, o segundo executa, e tocar em qualquer
// outro ponto da interface volta ao rótulo inicial sem fazer nada.

export function BotaoConfirmar({
  rotulo,
  rotuloConfirmar,
  rotuloAcessivel,
  aoConfirmar,
  desabilitado,
  pequeno,
}: {
  rotulo: string;
  rotuloConfirmar: string;
  /** Nome acessível quando o rótulo sozinho não diz sobre o que age. */
  rotuloAcessivel?: string;
  aoConfirmar: () => void;
  desabilitado?: boolean;
  pequeno?: boolean;
}) {
  const [armado, setArmado] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armado) return;
    function desarmar(evento: PointerEvent | KeyboardEvent) {
      if (evento instanceof KeyboardEvent && evento.key !== "Escape") return;
      if (evento instanceof PointerEvent && ref.current?.contains(evento.target as Node)) return;
      setArmado(false);
    }
    document.addEventListener("pointerdown", desarmar);
    document.addEventListener("keydown", desarmar);
    return () => {
      document.removeEventListener("pointerdown", desarmar);
      document.removeEventListener("keydown", desarmar);
    };
  }, [armado]);

  function tocar() {
    if (!armado) return setArmado(true);
    setArmado(false);
    aoConfirmar();
  }

  const texto = armado ? rotuloConfirmar : rotulo;
  return (
    <button
      ref={ref}
      type="button"
      onClick={tocar}
      onBlur={() => setArmado(false)}
      disabled={desabilitado}
      aria-label={rotuloAcessivel ? `${texto}: ${rotuloAcessivel}` : undefined}
      className={`botao botao-perigo ${pequeno ? "botao-pequeno" : ""} ${armado ? "!bg-saida !text-sobre-semantica" : ""}`}
    >
      {texto}
    </button>
  );
}
