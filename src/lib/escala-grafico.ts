// Escala do gráfico de seis meses (capability resumo, Scenario "Escala
// honesta"): começa em zero e termina num valor "redondo" que é ele mesmo um
// rótulo do eixo, com passos de 1, 2 ou 5 × 10ⁿ — a mesma regra do protótipo
// (chartSVG em openspec/prototype/Caixa Comum.html). Assim todo rótulo do
// eixo vertical corresponde a um valor alcançado pela escala.

export interface EscalaDoGrafico {
  topo: number;
  marcas: number[];
}

/** Topo para um gráfico sem valores (grupo novo): eixo de 0 a R$ 1.000. */
const TOPO_VAZIO = 1000;

export function escalaDoGrafico(maximo: number): EscalaDoGrafico {
  const base = maximo > 0 ? maximo : TOPO_VAZIO;
  const bruto = base / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
  const passo = [1, 2, 5, 10].map((f) => f * magnitude).find((p) => p >= bruto)!;
  const quantidade = Math.ceil(base / passo);
  return { topo: passo * quantidade, marcas: Array.from({ length: quantidade + 1 }, (_, i) => i * passo) };
}

/** Rótulo do eixo: "500", "1 mil", "2,5 mil". */
export function rotuloDoEixo(valor: number): string {
  return valor >= 1000 ? `${(valor / 1000).toLocaleString("pt-BR")} mil` : valor.toLocaleString("pt-BR");
}
