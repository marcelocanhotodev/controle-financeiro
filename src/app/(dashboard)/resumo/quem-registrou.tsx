import { formatarReais } from "@/lib/format/moeda";
import type { PessoaDoResumo } from "@/lib/resumo";

// "Quem registrou" (capability resumo, Requirement "Totais por pessoa"), no
// visual do `.people` do protótipo. Membros atuais (com R$ 0,00 quando não
// lançaram) e depois os ex-membros com lançamento no mês, para a soma das
// linhas fechar com os totais do mês.
export function QuemRegistrou({ pessoas, nomeDoMes }: { pessoas: PessoaDoResumo[]; nomeDoMes: string }) {
  return (
    <section className="quadro" aria-labelledby="titulo-pessoas">
      <h2 id="titulo-pessoas" className="mb-1">
        Quem registrou
      </h2>
      <p className="mb-3.5 text-[0.88rem] text-suave">Lançamentos de cada pessoa em {nomeDoMes}.</p>
      <div className="quadro-rolavel">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className="rotulo pb-2 text-left">
                Pessoa
              </th>
              <th scope="col" className="rotulo pb-2 text-right">
                Entradas
              </th>
              <th scope="col" className="rotulo pb-2 text-right">
                Saídas
              </th>
            </tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr
                key={p.id}
                // Opacidade de 70%: exceção de contraste aceita no design (o texto
                // "(ex-membro)" é o sinal acessível); o teste de acessibilidade
                // desliga só a regra de contraste nas linhas com este atributo.
                data-ex-membro={p.exMembro || undefined}
                className={p.exMembro ? "opacity-70" : undefined}
              >
                <th scope="row" className="border-t border-linha py-[9px] pr-3 text-left font-normal [overflow-wrap:anywhere]">
                  {p.exMembro ? `${p.nome} (ex-membro)` : p.nome}
                </th>
                <td className="num whitespace-nowrap border-t border-linha py-[9px] pl-3 text-right">{formatarReais(p.entradas)}</td>
                <td className="num whitespace-nowrap border-t border-linha py-[9px] pl-3 text-right">{formatarReais(p.saidas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
