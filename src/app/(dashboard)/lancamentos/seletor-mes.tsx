"use client";

// Seletor de mês (capability lancamentos, Requirement "Seleção de mês"): o mês
// atual e os meses com lançamentos, do mais recente para o mais antigo.

import { Campo } from "@/components/campo";
import { useTrocarParametros } from "./url-filtros";

export function SeletorMes({ meses, selecionado }: { meses: { chave: string; nome: string }[]; selecionado: string }) {
  const trocar = useTrocarParametros();

  return (
    <div className="min-w-[200px]">
      <Campo rotulo="Mês">
        {(props) => (
          <select value={selecionado} onChange={(e) => trocar({ mes: e.target.value })} {...props}>
            {meses.map((mes) => (
              <option key={mes.chave} value={mes.chave}>
                {mes.nome}
              </option>
            ))}
          </select>
        )}
      </Campo>
    </div>
  );
}
