// ============================================================================
// Regra de escolha do grupo ativo (capability: grupos). Função pura, sem
// banco, usada por getGrupoAtual() (src/lib/grupo-atual.ts) e por
// sairDoGrupo (src/lib/actions/grupo.ts). Modelo: src/lib/clinica-selecao.ts
// do matilha-app, que isola a mesma decisão para poder testá-la sozinha.
//
// Ver design.md, "Grupo ativo no banco, com fallback em getGrupoAtual()".
// O login não escolhe grupo: a primeira chamada a getGrupoAtual() aplica esta
// mesma regra.
// ============================================================================

export interface ParticipacaoParaSelecao {
  grupoId: number;
  entrouEm: Date;
}

/**
 * 1. `grupoAtivoId`, se a pessoa ainda participa desse grupo;
 * 2. senão, a participação mais antiga (menor `entrouEm`, com `grupoId` como
 *    desempate);
 * 3. senão (nenhuma participação), `null`.
 */
export function escolherGrupoAtivo(
  grupoAtivoId: number | null,
  participacoes: readonly ParticipacaoParaSelecao[],
): number | null {
  if (grupoAtivoId !== null && participacoes.some((p) => p.grupoId === grupoAtivoId)) {
    return grupoAtivoId;
  }

  let maisAntiga: ParticipacaoParaSelecao | null = null;
  for (const p of participacoes) {
    if (
      maisAntiga === null ||
      p.entrouEm.getTime() < maisAntiga.entrouEm.getTime() ||
      (p.entrouEm.getTime() === maisAntiga.entrouEm.getTime() && p.grupoId < maisAntiga.grupoId)
    ) {
      maisAntiga = p;
    }
  }
  return maisAntiga?.grupoId ?? null;
}
