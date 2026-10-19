// Categorias fixas por tipo (capability: lancamentos, Requirement
// "Categorias"). Ficam no código, não numa tabela: só valeria a pena ter
// tabela quando as categorias forem editáveis (design.md, "Categorias fixas
// no código").

import type { TipoLancamento } from "@prisma/client";

export const CATEGORIAS = {
  SAIDA: ["Moradia", "Mercado", "Contas", "Transporte", "Lazer", "Saúde", "Viagem", "Outros"],
  ENTRADA: ["Salário", "Extra", "Aporte", "Outros"],
} as const satisfies Record<TipoLancamento, readonly string[]>;

export function categoriaValida(tipo: TipoLancamento, categoria: string): boolean {
  return (CATEGORIAS[tipo] as readonly string[]).includes(categoria);
}
