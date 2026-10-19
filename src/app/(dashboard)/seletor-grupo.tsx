"use client";

// Seletor de grupo do topo (capability grupos, Requirements "Lista de grupos
// e grupo ativo" e "Seletor de grupo e pessoa no topo"). A troca grava o
// grupo ativo no banco e recarrega os dados da tela, sem sair e entrar.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso";
import { trocarGrupoAtivo } from "@/lib/actions/grupo";
import { CLASSE_CONTROLE } from "@/components/campo";

export function SeletorGrupo({ grupos, grupoAtivoId }: { grupos: { id: number; nome: string }[]; grupoAtivoId: number }) {
  const router = useRouter();
  const avisar = useAviso();
  const [selecionado, setSelecionado] = useState(grupoAtivoId);
  const [trocando, iniciarTroca] = useTransition();

  function trocar(evento: React.ChangeEvent<HTMLSelectElement>) {
    const grupoId = Number(evento.target.value);
    setSelecionado(grupoId);
    iniciarTroca(async () => {
      const resultado = await trocarGrupoAtivo(grupoId);
      if (!resultado.ok) {
        setSelecionado(grupoAtivoId);
        avisar(resultado.erro ?? "Não foi possível trocar de grupo.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <label htmlFor="seletor-grupo" className="sr-only">
        Grupo
      </label>
      <select
        id="seletor-grupo"
        value={selecionado}
        onChange={trocar}
        disabled={trocando}
        className={`${CLASSE_CONTROLE} w-auto max-w-[210px]`}
      >
        {grupos.map((grupo) => (
          <option key={grupo.id} value={grupo.id}>
            {grupo.nome}
          </option>
        ))}
      </select>
    </>
  );
}
