"use client";

// "Criar outro grupo" e "Entrar com um código" (capability grupos,
// Requirements "Criação de grupo", "Entrada em grupo por código" e "Pessoa
// sem grupo"), no visual do protótipo.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { criarGrupo, entrarPorCodigo, type AcaoGrupoResultado } from "@/lib/actions/grupo";
import { useMontado } from "@/lib/hooks/use-montado";

function FormularioGrupo({
  titulo,
  subtitulo,
  rotulo,
  nomeCampo,
  placeholder,
  botao,
  fantasma,
  acao,
}: {
  titulo: string;
  subtitulo: string;
  rotulo: string;
  nomeCampo: string;
  placeholder: string;
  botao: string;
  fantasma?: boolean;
  acao: (valor: string) => Promise<AcaoGrupoResultado>;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const montado = useMontado();
  const refCampo = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    setErro(null);
    setEnviando(true);
    const resultado = await acao(String(new FormData(formulario).get(nomeCampo) ?? ""));
    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível concluir.");
      refCampo.current?.focus();
      return;
    }
    if (resultado.mensagem) avisar(resultado.mensagem);
    formulario.reset();
    router.refresh();
  }

  return (
    <div>
      <h2>{titulo}</h2>
      <p className="mb-3.5 text-[0.88rem] text-suave">{subtitulo}</p>
      <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
        <Campo rotulo={rotulo} erro={erro ?? undefined}>
          {(props) => (
            <input ref={refCampo} type="text" name={nomeCampo} autoComplete="off" placeholder={placeholder} {...props} />
          )}
        </Campo>
        <button type="submit" className={`botao self-start ${fantasma ? "botao-fantasma" : ""}`} disabled={enviando || !montado}>
          {botao}
        </button>
      </form>
    </div>
  );
}

export function CriarOuEntrar({ outroGrupo }: { outroGrupo: boolean }) {
  return (
    <section className="quadro flex flex-col gap-5">
      <FormularioGrupo
        titulo={outroGrupo ? "Criar outro grupo" : "Criar um grupo"}
        subtitulo="Separe o caixa da casa, de uma viagem, de um projeto."
        rotulo="Nome do grupo"
        nomeCampo="nome"
        placeholder="Ex.: Reforma da cozinha"
        botao="Criar grupo"
        acao={(nome) => criarGrupo({ nome })}
      />
      <hr className="border-linha" />
      <FormularioGrupo
        titulo="Entrar com um código"
        subtitulo="Peça o código para quem administra o grupo."
        rotulo="Código do grupo"
        nomeCampo="codigo"
        placeholder="Ex.: VIAGEM-4821"
        botao="Entrar no grupo"
        fantasma
        acao={(codigo) => entrarPorCodigo({ codigo })}
      />
    </section>
  );
}
