"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { criarAviso, msAteExpirar, type AcaoAviso, type Aviso } from "./aviso-regras";

// Aviso de retorno (capability estrutura-app, Requirement "Avisos de
// retorno"), no visual do `.toast` do protótipo. A região `aria-live` fica
// sempre montada — leitores de tela só anunciam mudanças numa região que já
// existia antes do texto aparecer.
//
// Uso: `const avisar = useAviso(); avisar("Lançamento excluído.", { rotulo:
// "Desfazer", executar: restaurar })`.

type Avisar = (mensagem: string, acao?: AcaoAviso) => void;

const AvisoContext = createContext<Avisar | null>(null);

export function useAviso(): Avisar {
  const avisar = useContext(AvisoContext);
  if (!avisar) throw new Error("useAviso precisa estar dentro de <AvisoProvider>.");
  return avisar;
}

export function AvisoProvider({ children }: { children: React.ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const proximoId = useRef(1);

  const avisar = useCallback<Avisar>((mensagem, acao) => {
    setAviso(criarAviso(proximoId.current++, mensagem, Date.now(), acao));
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const timer = setTimeout(() => setAviso(null), msAteExpirar(aviso, Date.now()));
    return () => clearTimeout(timer);
  }, [aviso]);

  function executarAcao() {
    aviso?.acao?.executar();
    setAviso(null);
  }

  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true">
        {aviso && (
          <div className="fixed bottom-[calc(20px+env(safe-area-inset-bottom,0px))] left-1/2 z-10 flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-3.5 rounded-[10px] bg-texto px-4 py-[11px] font-medium text-fundo shadow-[0_8px_24px_rgba(0,0,0,.25)]">
            <span>{aviso.mensagem}</span>
            {aviso.acao && (
              <button type="button" onClick={executarAcao} className="font-semibold underline">
                {aviso.acao.rotulo}
              </button>
            )}
          </div>
        )}
      </div>
    </AvisoContext.Provider>
  );
}
