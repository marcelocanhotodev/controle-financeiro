"use client";

// Tela "Entrar / Criar conta" (capability: autenticacao, Requirement "Tela de
// login"), no visual do protótipo: as duas opções num mesmo cartão, trocadas
// pelo seletor do topo, com erros dentro do formulário (role="alert", pelo
// componente Campo) e o foco levado ao campo com problema.

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Campo } from "@/components/campo";
import { cadastrar } from "@/lib/actions/cadastro";
import type { CampoCadastro } from "@/lib/validators/cadastro";
import { destinoSeguro } from "@/lib/url-retorno";
import { useMontado } from "@/lib/hooks/use-montado";

export type ModoAcesso = "entrar" | "criar";

const MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha incorretos.";


export function TelaAcesso({ modoInicial, retorno }: { modoInicial: ModoAcesso; retorno?: string }) {
  const [modo, setModo] = useState<ModoAcesso>(modoInicial);

  return (
    <>
      <div role="group" aria-label="Acesso" className="grid grid-cols-2 gap-1 rounded-[10px] bg-surface-2 p-1">
        {(["entrar", "criar"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            aria-pressed={modo === opcao}
            onClick={() => setModo(opcao)}
            className={`rounded-[7px] p-2 font-semibold ${
              modo === opcao ? "bg-surface text-texto shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-suave"
            }`}
          >
            {opcao === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>
      {/* `key` remonta o formulário ao trocar de opção: os erros do outro somem. */}
      {modo === "entrar" ? <FormularioEntrar key="entrar" retorno={retorno} /> : <FormularioCriar key="criar" />}
    </>
  );
}

function FormularioEntrar({ retorno }: { retorno?: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const montado = useMontado();
  const refEmail = useRef<HTMLInputElement>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Limpa antes de enviar: um erro repetido volta a ser anunciado.
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const resultado = await signIn("credentials", {
      email: String(dados.get("email") ?? ""),
      senha: String(dados.get("senha") ?? ""),
      redirect: false,
    });
    setEnviando(false);

    if (!resultado || resultado.error) {
      setErro(MENSAGEM_LOGIN_INVALIDO);
      refEmail.current?.focus();
      return;
    }
    router.push(destinoSeguro(retorno));
    router.refresh();
  }

  return (
    <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
      <Campo rotulo="E-mail">
        {(props) => (
          <input ref={refEmail} type="email" name="email" autoComplete="email" placeholder="voce@email.com" {...props} />
        )}
      </Campo>
      <Campo rotulo="Senha">
        {(props) => <input type="password" name="senha" autoComplete="current-password" {...props} />}
      </Campo>
      {erro && (
        <p role="alert" className="rounded-lg bg-saida-suave px-3 py-[9px] text-[0.88rem] font-medium text-saida">
          {erro}
        </p>
      )}
      <button type="submit" className="botao w-full" disabled={enviando || !montado}>
        Entrar
      </button>
      <Link href="/esqueci-senha" className="self-start text-sm font-semibold text-destaque underline">
        Esqueci minha senha
      </Link>
    </form>
  );
}

function FormularioCriar() {
  const router = useRouter();
  const [erro, setErro] = useState<{ campo?: CampoCadastro; mensagem: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const montado = useMontado();
  const refs = {
    nome: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    senha: useRef<HTMLInputElement>(null),
    codigoGrupo: useRef<HTMLInputElement>(null),
  };

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    // Limpa antes de enviar: um erro repetido volta a ser anunciado.
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "");
    const senha = String(dados.get("senha") ?? "");

    const resultado = await cadastrar({
      nome: String(dados.get("nome") ?? ""),
      email,
      senha,
      codigoGrupo: String(dados.get("codigoGrupo") ?? ""),
    });

    if (!resultado.ok) {
      setEnviando(false);
      setErro({ campo: resultado.campo, mensagem: resultado.erro ?? "Não foi possível criar a conta." });
      (resultado.campo ? refs[resultado.campo] : refs.nome).current?.focus();
      return;
    }

    const login = await signIn("credentials", { email, senha, redirect: false });
    setEnviando(false);
    if (!login || login.error) {
      // A conta foi criada; só a entrada automática falhou.
      router.push("/login");
      return;
    }
    router.push("/resumo");
    router.refresh();
  }

  const erroDe = (campo: CampoCadastro) => (erro?.campo === campo ? erro.mensagem : undefined);

  return (
    <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
      <Campo rotulo="Nome" erro={erroDe("nome")}>
        {(props) => (
          <input
            ref={refs.nome}
            type="text"
            name="nome"
            autoComplete="name"
            placeholder="Como o grupo vai ver você"
            {...props}
          />
        )}
      </Campo>
      <Campo rotulo="E-mail" erro={erroDe("email")}>
        {(props) => (
          <input ref={refs.email} type="email" name="email" autoComplete="email" placeholder="voce@email.com" {...props} />
        )}
      </Campo>
      <Campo rotulo="Senha" erro={erroDe("senha")}>
        {(props) => (
          <input
            ref={refs.senha}
            type="password"
            name="senha"
            autoComplete="new-password"
            placeholder="Mínimo de 8 caracteres"
            {...props}
          />
        )}
      </Campo>
      <Campo
        rotulo="Código do grupo (opcional)"
        dica="Deixe em branco para criar um grupo novo só seu."
        erro={erroDe("codigoGrupo")}
      >
        {(props) => (
          <input
            ref={refs.codigoGrupo}
            type="text"
            name="codigoGrupo"
            autoComplete="off"
            placeholder="Ex.: CASA-2026"
            {...props}
          />
        )}
      </Campo>
      {erro && !erro.campo && (
        <p role="alert" className="rounded-lg bg-saida-suave px-3 py-[9px] text-[0.88rem] font-medium text-saida">
          {erro.mensagem}
        </p>
      )}
      <button type="submit" className="botao w-full" disabled={enviando || !montado}>
        Criar conta
      </button>
    </form>
  );
}
