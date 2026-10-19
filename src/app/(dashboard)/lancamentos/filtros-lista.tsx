"use client";

// Filtros Tipo e Pessoa (capability lancamentos, Requirement "Filtros da
// lista"). Um único filtro Pessoa com os membros atuais e os ex-membros que
// têm lançamentos no mês, marcados com "(ex-membro)".

import { Campo } from "@/components/campo";
import type { PessoaDoFiltro } from "@/lib/lancamentos";
import { useTrocarParametros } from "./url-filtros";

export function FiltrosLista({ tipo, autor, pessoas }: { tipo: string; autor: string; pessoas: PessoaDoFiltro[] }) {
  const trocar = useTrocarParametros();

  return (
    <div className="mb-3 mt-3 flex flex-wrap gap-2.5 [&>*]:flex-[1_1_140px]">
      <Campo rotulo="Tipo">
        {(props) => (
          <select value={tipo} onChange={(e) => trocar({ tipo: e.target.value })} {...props}>
            <option value="">Todos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SAIDA">Saídas</option>
          </select>
        )}
      </Campo>
      <Campo rotulo="Pessoa">
        {(props) => (
          <select value={autor} onChange={(e) => trocar({ autor: e.target.value })} {...props}>
            <option value="">Todas</option>
            {pessoas.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.exMembro ? `${pessoa.nome} (ex-membro)` : pessoa.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>
    </div>
  );
}
