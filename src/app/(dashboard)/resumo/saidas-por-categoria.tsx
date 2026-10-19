import { formatarReais } from "@/lib/format/moeda";
import type { CategoriaDoMes } from "@/lib/resumo";

// Saídas por categoria (capability resumo, Requirement "Saídas por
// categoria"), no visual do `.cats` do protótipo: da maior para a menor, com
// valor, percentual e barra proporcional à maior categoria.
export function SaidasPorCategoria({ categorias, nomeDoMes }: { categorias: CategoriaDoMes[]; nomeDoMes: string }) {
  return (
    <section className="quadro" aria-labelledby="titulo-categorias">
      <h2 id="titulo-categorias" className="mb-1">
        Saídas por categoria
      </h2>
      <p className="mb-3.5 text-[0.88rem] text-suave">{nomeDoMes}</p>
      {categorias.length === 0 ? (
        <p className="py-[18px] text-center text-suave">Nenhuma saída registrada neste mês.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {categorias.map((c) => (
            <li key={c.categoria} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
              <span className="[overflow-wrap:anywhere]">{c.categoria}</span>
              <span>
                <span className="num">{formatarReais(c.valor)}</span>{" "}
                <span className="text-[0.8rem] text-suave">{c.percentual}%</span>
              </span>
              <span aria-hidden="true" className="col-span-2 h-2 overflow-hidden rounded bg-surface-2">
                <i className="block h-full rounded bg-destaque" style={{ width: `${c.proporcao}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
