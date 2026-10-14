"use client";

import { useEffect, useState } from "react";
import { useAviso } from "@/components/aviso";

export function ExemploAviso() {
  const avisar = useAviso();
  const [desfeito, setDesfeito] = useState(false);
  // Sinal para o teste só clicar depois da hidratação — antes disso, os
  // botões já aparecem (HTML do servidor), mas ainda sem onClick.
  const [hidratado, setHidratado] = useState(false);
  useEffect(() => setHidratado(true), []);

  return (
    <main
      data-hidratado={hidratado ? "sim" : "nao"}
      className="mx-auto flex max-w-app flex-col items-start gap-3 px-4 py-6"
    >
      <button type="button" onClick={() => avisar("Ação concluída.")}>
        Ação simples
      </button>
      <button
        type="button"
        onClick={() => {
          setDesfeito(false);
          avisar("Item excluído.", { rotulo: "Desfazer", executar: () => setDesfeito(true) });
        }}
      >
        Ação reversível
      </button>
      <p>{desfeito ? "Desfeito" : "Não desfeito"}</p>
    </main>
  );
}
