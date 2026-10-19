// Tarefa 2.1 — validação do novo lançamento com as mensagens da spec.

import { describe, it, expect } from "vitest";
import { CATEGORIAS } from "@/lib/categorias";
import { validarNovoLancamento } from "@/lib/validators/lancamento";

const valido = { tipo: "SAIDA", descricao: "Mercado da semana", valor: "412,80", categoria: "Mercado", data: "2026-10-10" };

describe("categorias", () => {
  it('Scenarios "Categorias de saída" e "Categorias de entrada"', () => {
    expect(CATEGORIAS.SAIDA).toEqual(["Moradia", "Mercado", "Contas", "Transporte", "Lazer", "Saúde", "Viagem", "Outros"]);
    expect(CATEGORIAS.ENTRADA).toEqual(["Salário", "Extra", "Aporte", "Outros"]);
  });
});

describe("validarNovoLancamento", () => {
  it("aceita um lançamento válido, com valor exato e dia do calendário", () => {
    const resultado = validarNovoLancamento(valido);
    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.dados.valor.toString()).toBe("412.8");
      expect(resultado.dados.dia).toEqual({ ano: 2026, mes: 10, dia: 10 });
      expect(resultado.dados.descricao).toBe("Mercado da semana");
    }
  });

  it('Scenario "Descrição vazia"', () => {
    expect(validarNovoLancamento({ ...valido, descricao: "   " })).toEqual({
      ok: false,
      campo: "descricao",
      erro: "Descreva o lançamento.",
    });
  });

  it.each(["", "0", "0,00", "-10", "abc"])('Scenario "Valor inválido" — "%s"', (valor) => {
    expect(validarNovoLancamento({ ...valido, valor })).toEqual({
      ok: false,
      campo: "valor",
      erro: "Informe um valor maior que zero, como 125,90.",
    });
  });

  it("valor acima de R$ 99.999.999,99 é recusado", () => {
    expect(validarNovoLancamento({ ...valido, valor: "100.000.000,00" })).toMatchObject({ ok: false, campo: "valor" });
  });

  it('Scenario "Data vazia"', () => {
    expect(validarNovoLancamento({ ...valido, data: "" })).toEqual({ ok: false, campo: "data", erro: "Escolha a data." });
    expect(validarNovoLancamento({ ...valido, data: "2026-02-30" })).toMatchObject({ ok: false, campo: "data" });
  });

  it("categoria de outro tipo é recusada", () => {
    expect(validarNovoLancamento({ ...valido, categoria: "Salário" })).toEqual({
      ok: false,
      campo: "categoria",
      erro: "Escolha uma categoria.",
    });
    expect(validarNovoLancamento({ ...valido, tipo: "ENTRADA", categoria: "Salário" }).ok).toBe(true);
  });

  it("descarta id, autor e grupo enviados pelo cliente", () => {
    const resultado = validarNovoLancamento({ ...valido, id: 9, autorId: 9, grupoId: 9 });
    expect(resultado.ok && Object.keys(resultado.dados).sort()).toEqual(["categoria", "descricao", "dia", "tipo", "valor"]);
  });

  it("com vários problemas, aponta o primeiro na ordem do formulário", () => {
    expect(validarNovoLancamento({ ...valido, descricao: "", valor: "0", data: "" })).toMatchObject({ campo: "descricao" });
  });
});
