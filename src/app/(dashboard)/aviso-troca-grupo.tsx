"use client";

import { useEffect } from "react";
import { useAviso } from "@/components/aviso";

// Capability grupos, Scenario "Grupo ativo deixa de valer e há outro grupo":
// mostra uma vez o aviso de que o grupo anterior não vale mais. Só é montado
// na requisição em que getGrupoAtual() trocou o grupo.
export function AvisoTrocaGrupo({ grupoAnterior }: { grupoAnterior: string }) {
  const avisar = useAviso();
  useEffect(() => {
    avisar(`Você não participa mais de "${grupoAnterior}".`);
  }, [avisar, grupoAnterior]);
  return null;
}
