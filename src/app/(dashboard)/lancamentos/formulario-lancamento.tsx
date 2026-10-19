"use client";

// Novo lançamento (capability lancamentos, Requirements "Registro de
// lançamento" e "Categorias"), no visual do protótipo: Saída/Entrada no
// topo, descrição, valor, categoria e data. Trocar o tipo troca as categorias
// e o texto do botão, mantendo descrição e valor. Depois de salvar, a lista
// vai para o mês do lançamento, sem filtros.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { criarLancamento } from "@/lib/actions/lancamento";
import { CATEGORIAS } from "@/lib/categorias";
import { useMontado } from "@/lib/hooks/use-montado";
import type { CampoLancamento } from "@/lib/validators/lancamento";

type Tipo = "SAIDA" | "ENTRADA";

export function FormularioLancamento({ nomePessoa, hoje }: { nomePessoa: string; hoje: string }) {
  const router = useRouter();
  const avisar = useAviso();
  const montado = useMontado();
  const [tipo, setTipo] = useState<Tipo>("SAIDA");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS.SAIDA[0]);
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<{ campo?: CampoLancamento; mensagem: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refs = {
    descricao: useRef<HTMLInputElement>(null),
    valor: useRef<HTMLInputElement>(null),
    categoria: useRef<HTMLSelectElement>(null),
    data: useRef<HTMLInputElement>(null),
  };

  function trocarTipo(novo: Tipo) {
    setTipo(novo);
    setCategoria(CATEGORIAS[novo][0]);
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const resultado = await criarLancamento({ tipo, descricao, valor, categoria, data });
    setEnviando(false);

    if (!resultado.ok) {
      setErro({ campo: resultado.campo, mensagem: resultado.erro ?? "Não foi possível registrar." });
      (resultado.campo ? refs[resultado.campo] : refs.descricao).current?.focus();
      return;
    }

    if (resultado.mensagem) avisar(resultado.mensagem);
    setDescricao("");
    setValor("");
    refs.descricao.current?.focus();
    // Scenario "Ver o lançamento recém-criado": mês do lançamento, sem filtros.
    router.replace(`/lancamentos?mes=${resultado.mes}`, { scroll: false });
    router.refresh();
  }

  const erroDe = (campo: CampoLancamento) => (erro?.campo === campo ? erro.mensagem : undefined);

  return (
    <section className="quadro" aria-labelledby="titulo-novo">
      <h2 id="titulo-novo">Novo lançamento</h2>
      <p className="mb-3.5 text-[0.88rem] text-suave">Registrado em nome de {nomePessoa}.</p>
      <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
        <div role="radiogroup" aria-label="Tipo do lançamento" className="grid grid-cols-2 gap-1 rounded-[10px] bg-surface-2 p-1">
          {(
            [
              ["SAIDA", "Saída", "peer-checked:bg-saida"],
              ["ENTRADA", "Entrada", "peer-checked:bg-entrada"],
            ] as const
          ).map(([valorTipo, rotulo, corMarcada]) => (
            <label key={valorTipo} className="relative block">
              <input
                type="radio"
                name="tipo"
                value={valorTipo}
                checked={tipo === valorTipo}
                onChange={() => trocarTipo(valorTipo)}
                className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
              />
              <span
                className={`block rounded-[7px] p-[9px] text-center font-semibold text-suave peer-checked:text-sobre-semantica peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-destaque ${corMarcada}`}
              >
                {rotulo}
              </span>
            </label>
          ))}
        </div>
        <Campo rotulo="Descrição" erro={erroDe("descricao")}>
          {(props) => (
            <input
              ref={refs.descricao}
              type="text"
              name="descricao"
              autoComplete="off"
              placeholder="Ex.: Mercado da semana"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              {...props}
            />
          )}
        </Campo>
        <Campo rotulo="Valor (R$)" erro={erroDe("valor")}>
          {(props) => (
            <input
              ref={refs.valor}
              type="text"
              name="valor"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              {...props}
            />
          )}
        </Campo>
        <Campo rotulo="Categoria" erro={erroDe("categoria")}>
          {(props) => (
            <select ref={refs.categoria} name="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} {...props}>
              {CATEGORIAS[tipo].map((opcao) => (
                <option key={opcao}>{opcao}</option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Data" erro={erroDe("data")}>
          {(props) => (
            <input ref={refs.data} type="date" name="data" value={data} onChange={(e) => setData(e.target.value)} {...props} />
          )}
        </Campo>
        {erro && !erro.campo && (
          <p role="alert" className="rounded-lg bg-saida-suave px-3 py-[9px] text-[0.88rem] font-medium text-saida">
            {erro.mensagem}
          </p>
        )}
        <button type="submit" className="botao w-full" disabled={enviando || !montado}>
          {tipo === "ENTRADA" ? "Registrar entrada" : "Registrar saída"}
        </button>
      </form>
    </section>
  );
}
