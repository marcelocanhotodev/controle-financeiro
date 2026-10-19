// Valores em reais (capability: lancamentos, Requirement "Valores em reais").
// Sempre `Prisma.Decimal` ou string — nunca `number`, que soma com erro de
// arredondamento (0,1 + 0,2 !== 0,3). Ver design.md, "Dinheiro em
// Decimal(10, 2)".

import { Prisma } from "@prisma/client";

/** Maior valor de um lançamento: cabe em Decimal(10, 2). */
export const VALOR_MAXIMO = new Prisma.Decimal("99999999.99");

/**
 * Lê o valor digitado: aceita "1.250,50", "1250,50", "1250.50", "1250" e
 * "R$ 1.250,50". Devolve `null` para vazio, texto que não é número ou mais de
 * duas casas decimais. Não confere se é positivo — isso é do validador.
 */
export function lerValor(texto: string): Prisma.Decimal | null {
  let limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  if (!limpo) return null;

  const sinal = limpo.startsWith("-") ? "-" : "";
  if (sinal) limpo = limpo.slice(1);

  if (limpo.includes(",")) {
    // Formato brasileiro: ponto separa milhar, vírgula separa os centavos.
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(limpo)) return null;
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "1.250" sem vírgula: ponto como separador de milhar.
    limpo = limpo.replace(/\./g, "");
  } else if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return null;
  }

  return new Prisma.Decimal(sinal + limpo);
}

/** "R$ 1.250,50". */
export function formatarReais(valor: Prisma.Decimal | string): string {
  const decimal = typeof valor === "string" ? new Prisma.Decimal(valor) : valor;
  const [inteiro, centavos] = decimal.abs().toFixed(2).split(".");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${decimal.isNegative() ? "-" : ""}R$ ${comMilhar},${centavos}`;
}

/** Soma exata. */
export function somar(valores: readonly (Prisma.Decimal | string)[]): Prisma.Decimal {
  return valores.reduce<Prisma.Decimal>((total, valor) => total.plus(valor), new Prisma.Decimal(0));
}
