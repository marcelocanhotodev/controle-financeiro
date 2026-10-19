// Tarefa 2.2 — escolha do grupo ativo nos três casos.

import { describe, it, expect } from "vitest";
import { escolherGrupoAtivo } from "@/lib/grupo-selecao";

const dia = (n: number) => new Date(Date.UTC(2026, 0, n));

describe("escolherGrupoAtivo", () => {
  const participacoes = [
    { grupoId: 5, entrouEm: dia(10) },
    { grupoId: 3, entrouEm: dia(2) },
    { grupoId: 9, entrouEm: dia(20) },
  ];

  it("mantém o grupo ativo quando a pessoa ainda participa dele", () => {
    expect(escolherGrupoAtivo(9, participacoes)).toBe(9);
  });

  it("usa a participação mais antiga quando o grupo ativo não vale mais", () => {
    expect(escolherGrupoAtivo(42, participacoes)).toBe(3);
  });

  it("usa a participação mais antiga quando não há grupo ativo", () => {
    expect(escolherGrupoAtivo(null, participacoes)).toBe(3);
  });

  it("desempata pelo menor grupoId quando duas participações começaram no mesmo instante", () => {
    expect(
      escolherGrupoAtivo(null, [
        { grupoId: 8, entrouEm: dia(1) },
        { grupoId: 4, entrouEm: dia(1) },
      ]),
    ).toBe(4);
  });

  it("devolve null quando a pessoa não participa de nenhum grupo", () => {
    expect(escolherGrupoAtivo(7, [])).toBeNull();
    expect(escolherGrupoAtivo(null, [])).toBeNull();
  });
});
