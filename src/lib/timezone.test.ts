// Tarefa 1.2 — calendário de America/Sao_Paulo (spec lancamentos, Scenario
// "Data padrão").

import { describe, it, expect } from "vitest";
import {
  deDataDoBanco,
  formatarDiaMes,
  hoje,
  limitesDoMes,
  nomeDoMes,
  paraChaveDeData,
  paraChaveDeMes,
  paraDataDoBanco,
  paraDiaCalendarioDeChave,
  paraMesDeChave,
} from "@/lib/timezone";

describe("timezone", () => {
  it("hoje é o dia de São Paulo, não o do servidor (UTC)", () => {
    // 19/10/2026 01:30 UTC ainda é 18/10 às 22:30 em São Paulo.
    expect(hoje(new Date("2026-10-19T01:30:00Z"))).toEqual({ ano: 2026, mes: 10, dia: 18 });
    expect(hoje(new Date("2026-10-19T03:00:00Z"))).toEqual({ ano: 2026, mes: 10, dia: 19 });
  });

  it("chave de data ida e volta, recusando datas que não existem", () => {
    expect(paraChaveDeData({ ano: 2026, mes: 3, dia: 7 })).toBe("2026-03-07");
    expect(paraDiaCalendarioDeChave("2026-03-07")).toEqual({ ano: 2026, mes: 3, dia: 7 });
    expect(paraDiaCalendarioDeChave("2026-02-30")).toBeNull();
    expect(paraDiaCalendarioDeChave("")).toBeNull();
  });

  it("coluna @db.Date guarda o dia à meia-noite UTC", () => {
    const data = paraDataDoBanco({ ano: 2026, mes: 10, dia: 10 });
    expect(data.toISOString()).toBe("2026-10-10T00:00:00.000Z");
    expect(deDataDoBanco(data)).toEqual({ ano: 2026, mes: 10, dia: 10 });
    expect(formatarDiaMes(deDataDoBanco(data))).toBe("10/10");
  });

  it('meses: chave da URL, nome "Outubro de 2026" e limites', () => {
    expect(paraChaveDeMes({ ano: 2026, mes: 5 })).toBe("2026-05");
    expect(paraMesDeChave("2026-10")).toEqual({ ano: 2026, mes: 10 });
    expect(paraMesDeChave("2026-13")).toBeNull();
    expect(paraMesDeChave("outubro")).toBeNull();
    expect(nomeDoMes({ ano: 2026, mes: 10 })).toBe("Outubro de 2026");
    const { inicio, fim } = limitesDoMes({ ano: 2026, mes: 12 });
    expect(inicio.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
