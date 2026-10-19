"use client";

// Lista de membros da aba Grupo (capability grupos, Requirements "Lista de
// membros", "Remoção de membro", "Gestão de convites pendentes" e "Saída do
// grupo"), no visual do `.members` do protótipo. As permissões valem no
// servidor; aqui só se esconde o que a pessoa não pode fazer.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { cancelarConvite, reenviarConvite } from "@/lib/actions/convite";
import { removerMembro, sairDoGrupo } from "@/lib/actions/grupo";

export interface MembroDaLista {
  usuarioId: number;
  nome: string;
  email: string;
  papel: "ADMIN" | "MEMBRO";
}

export interface ConvitePendente {
  id: number;
  email: string;
  envioFalhou: boolean;
}

function Inicial({ texto }: { texto: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-destaque-suave text-[0.85rem] font-bold text-destaque"
    >
      {texto}
    </span>
  );
}

function Selo({ tipo }: { tipo: "ADMIN" | "MEMBRO" | "PENDENTE" }) {
  const estilos = {
    ADMIN: "bg-destaque-suave text-destaque",
    MEMBRO: "bg-surface-2 text-suave",
    PENDENTE: "bg-saida-suave text-saida",
  };
  const textos = { ADMIN: "Administrador", MEMBRO: "Membro", PENDENTE: "Convite pendente" };
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold ${estilos[tipo]}`}>
      {textos[tipo]}
    </span>
  );
}

export function ListaMembros({
  membros,
  convites,
  euId,
  ehAdmin,
}: {
  membros: MembroDaLista[];
  convites: ConvitePendente[];
  euId: number;
  ehAdmin: boolean;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [executando, iniciar] = useTransition();

  function executar(acao: () => Promise<{ ok: boolean; erro?: string; mensagem?: string }>) {
    iniciar(async () => {
      const resultado = await acao();
      const mensagem = resultado.ok ? resultado.mensagem : resultado.erro;
      if (mensagem) avisar(mensagem);
      router.refresh();
    });
  }

  return (
    <section className="quadro" aria-labelledby="titulo-membros">
      <h2 id="titulo-membros">Membros ({membros.length})</h2>
      <p className="mb-3.5 text-[0.88rem] text-suave">
        Todos veem os lançamentos. Administradores também podem convidar pessoas e remover membros.
      </p>
      <ul>
        {membros.map((membro) => {
          const souEu = membro.usuarioId === euId;
          return (
            <li key={membro.usuarioId} className="flex items-center gap-3 border-t border-linha py-3 first:border-t-0">
              <Inicial texto={membro.nome.trim().charAt(0).toUpperCase()} />
              <span className="min-w-0 flex-1">
                <b className="block font-semibold [overflow-wrap:anywhere]">
                  {membro.nome}
                  {souEu && " (você)"}
                </b>
                <span className="text-[0.85rem] text-suave [overflow-wrap:anywhere]">{membro.email}</span>
              </span>
              <Selo tipo={membro.papel} />
              {ehAdmin && !souEu && (
                <BotaoConfirmar
                  rotulo="Remover"
                  rotuloConfirmar="Confirmar"
                  rotuloAcessivel={membro.nome}
                  pequeno
                  desabilitado={executando}
                  aoConfirmar={() => executar(() => removerMembro(membro.usuarioId))}
                />
              )}
            </li>
          );
        })}
        {ehAdmin &&
          convites.map((convite) => (
            <li key={`convite-${convite.id}`} className="flex flex-wrap items-center gap-3 border-t border-linha py-3">
              <Inicial texto="@" />
              <span className="min-w-0 flex-1">
                <b className="block font-semibold [overflow-wrap:anywhere]">{convite.email}</b>
                <span className={`text-[0.85rem] ${convite.envioFalhou ? "font-medium text-saida" : "text-suave"}`}>
                  {convite.envioFalhou ? "O e-mail não pôde ser enviado." : "Entra no grupo ao aceitar o convite."}
                </span>
              </span>
              <Selo tipo="PENDENTE" />
              <button
                type="button"
                className="botao botao-fantasma botao-pequeno"
                aria-label={`Reenviar convite para ${convite.email}`}
                disabled={executando}
                onClick={() => executar(() => reenviarConvite(convite.id))}
              >
                Reenviar
              </button>
              <button
                type="button"
                className="botao botao-fantasma botao-pequeno"
                aria-label={`Cancelar convite para ${convite.email}`}
                disabled={executando}
                onClick={() => executar(() => cancelarConvite(convite.id))}
              >
                Cancelar convite
              </button>
            </li>
          ))}
      </ul>
      <hr className="my-3.5 border-linha" />
      <BotaoConfirmar
        rotulo="Sair deste grupo"
        rotuloConfirmar="Confirmar saída do grupo"
        pequeno
        desabilitado={executando}
        aoConfirmar={() => executar(sairDoGrupo)}
      />
    </section>
  );
}
