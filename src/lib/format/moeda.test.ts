// Tarefa 1.2 — leitura e exibição de valores em reais, e somas exatas (spec
// lancamentos, Requirement "Valores em reais").

import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { formatarReais, lerValor, somar } from "@/lib/format/moeda";

describe("lerValor", () => {
  it.each([
    ["1.250,50", "1250.5"],
    ["1250,50", "1250.5"],
    ["1250.50", "1250.5"],
    ["1250", "1250"],
    ["1.250", "1250"],
    ["R$ 1.250,50", "1250.5"],
    ["0,10", "0.1"],
    ["125,9", "125.9"],
    ["-3,50", "-3.5"],
  ])('Scenario "Valor com vírgula ou ponto" — "%s" vale %s', (texto, esperado) => {
    expect(lerValor(texto)?.toString()).toBe(esperado);
  });

  it.each(["", "   ", "abc", "12,345", "1,2,3", "1.25.0", "12.345,6.7", "R$", "1e5"])('"%s" não é um valor', (texto) => {
    expect(lerValor(texto)).toBeNull();
  });
});

describe("formatarReais", () => {
  it('Scenario "Formato de exibição" — 1250,5 vira "R$ 1.250,50"', () => {
    expect(formatarReais(new Prisma.Decimal("1250.5"))).toBe("R$ 1.250,50");
    expect(formatarReais("412.8")).toBe("R$ 412,80");
    expect(formatarReais("99999999.99")).toBe("R$ 99.999.999,99");
    expect(formatarReais("0")).toBe("R$ 0,00");
  });
});

describe("somar", () => {
  it('Scenario "Sem erro de arredondamento" — dez lançamentos de R$ 0,10 somam exatamente R$ 1,00', () => {
    const total = somar(Array.from({ length: 10 }, () => lerValor("0,10")!));
    expect(total.equals(new Prisma.Decimal("1"))).toBe(true);
    expect(formatarReais(total)).toBe("R$ 1,00");
    // Com number, a mesma soma dá 0.9999999999999999.
    expect(Array.from({ length: 10 }, () => 0.1).reduce((a, b) => a + b, 0)).not.toBe(1);
  });
});
