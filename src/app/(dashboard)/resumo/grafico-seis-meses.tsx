"use client";

// Gráfico de entradas e saídas dos seis meses que terminam no mês escolhido
// (capability resumo, Requirement "Gráfico dos últimos seis meses"), com
// Recharts como faturamento-por-dia-chart.tsx do matilha-app e no visual do
// chartSVG do protótipo: barras agrupadas, mês escolhido com opacidade cheia
// e os demais atenuados, escala honesta a partir de zero (escala-grafico.ts),
// legenda e dica com o valor exato.
//
// Os valores chegam como string decimal; `Number` só serve para desenhar a
// altura das barras — o texto da dica e da tabela usa a string exata.

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { escalaDoGrafico, rotuloDoEixo } from "@/lib/escala-grafico";
import { formatarReais } from "@/lib/format/moeda";

export interface PontoDoGrafico {
  chave: string;
  /** "out", no eixo. */
  rotulo: string;
  /** "Outubro de 2026", na dica e na tabela. */
  nome: string;
  entradas: string;
  saidas: string;
}

interface Dado extends PontoDoGrafico {
  alturaEntradas: number;
  alturaSaidas: number;
}

function Dica({ active, payload }: { active?: boolean; payload?: { payload: Dado }[] }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div data-testid="dica-grafico" className="rounded-lg border border-linha bg-surface px-3 py-2 text-[0.85rem] shadow-md">
      <p className="font-semibold">{ponto.nome}</p>
      <p>
        Entradas: <span className="num text-entrada">{formatarReais(ponto.entradas)}</span>
      </p>
      <p>
        Saídas: <span className="num text-saida">{formatarReais(ponto.saidas)}</span>
      </p>
    </div>
  );
}

export function GraficoSeisMeses({ pontos, selecionado }: { pontos: PontoDoGrafico[]; selecionado: string }) {
  const dados: Dado[] = pontos.map((p) => ({ ...p, alturaEntradas: Number(p.entradas), alturaSaidas: Number(p.saidas) }));
  const { topo, marcas } = escalaDoGrafico(Math.max(0, ...dados.flatMap((d) => [d.alturaEntradas, d.alturaSaidas])));
  const opacidade = (chave: string) => (chave === selecionado ? 1 : 0.5);

  return (
    <div className="grafico">
      <div className="quadro-rolavel">
        <div className="h-[230px] min-w-[300px]" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={3} accessibilityLayer={false}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, topo]}
                ticks={marcas}
                interval={0}
                tickFormatter={rotuloDoEixo}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<Dica />} cursor={{ fillOpacity: 0.08 }} isAnimationActive={false} />
              <Bar dataKey="alturaEntradas" name="Entradas" maxBarSize={24} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {dados.map((d) => (
                  <Cell key={d.chave} style={{ fill: "var(--in)" }} fillOpacity={opacidade(d.chave)} />
                ))}
              </Bar>
              <Bar dataKey="alturaSaidas" name="Saídas" maxBarSize={24} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {dados.map((d) => (
                  <Cell key={d.chave} style={{ fill: "var(--out)" }} fillOpacity={opacidade(d.chave)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-2 flex gap-4 text-[0.85rem] text-suave" aria-hidden="true">
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-entrada" />
          Entradas
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-saida" />
          Saídas
        </span>
      </div>
      {/* Para leitores de tela, os mesmos valores em tabela. O sr-only fica
          num div: uma tabela não encolhe para 1 px e alargaria a página. */}
      <div className="sr-only">
        <table>
          <caption>Entradas e saídas dos últimos seis meses</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Entradas</th>
              <th scope="col">Saídas</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.chave}>
                <th scope="row">
                  {d.nome}
                  {d.chave === selecionado ? " (selecionado)" : ""}
                </th>
                <td>{formatarReais(d.entradas)}</td>
                <td>{formatarReais(d.saidas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
