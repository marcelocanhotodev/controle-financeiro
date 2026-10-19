// Tarefa 2.2 — escala do gráfico de seis meses (spec resumo, Scenario "Escala
// honesta").

import { describe, it, expect } from "vitest";
import { escalaDoGrafico, rotuloDoEixo } from "@/lib/escala-grafico";

describe("escalaDoGrafico", () => {
  it("começa em zero e o topo é a última marca, sempre acima do maior valor", () => {
    for (const maximo of [1, 99.9, 450, 4370, 12450, 13250.75, 99999999.99]) {
      const { topo, marcas } = escalaDoGrafico(maximo);
      expect(marcas[0]).toBe(0);
      expect(marcas.at(-1)).toBe(topo);
      expect(topo).toBeGreaterThanOrEqual(maximo);
      // Passos iguais entre as marcas.
      const passo = marcas[1] - marcas[0];
      expect(marcas.every((m, i) => Math.abs(m - i * passo) < 1e-9)).toBe(true);
    }
  });

  it("passos de 1, 2 ou 5 × 10ⁿ, como no protótipo", () => {
    expect(escalaDoGrafico(12450)).toEqual({ topo: 15000, marcas: [0, 5000, 10000, 15000] });
    expect(escalaDoGrafico(4370)).toEqual({ topo: 6000, marcas: [0, 2000, 4000, 6000] });
    expect(escalaDoGrafico(450)).toEqual({ topo: 600, marcas: [0, 200, 400, 600] });
  });

  it("gráfico sem valores (grupo novo) vai de 0 a 1 mil", () => {
    expect(escalaDoGrafico(0)).toEqual({ topo: 1000, marcas: [0, 500, 1000] });
  });
});

describe("rotuloDoEixo", () => {
  it('"500", "1 mil" e "2,5 mil"', () => {
    expect(rotuloDoEixo(0)).toBe("0");
    expect(rotuloDoEixo(500)).toBe("500");
    expect(rotuloDoEixo(1000)).toBe("1 mil");
    expect(rotuloDoEixo(2500)).toBe("2,5 mil");
    expect(rotuloDoEixo(15000)).toBe("15 mil");
  });
});
