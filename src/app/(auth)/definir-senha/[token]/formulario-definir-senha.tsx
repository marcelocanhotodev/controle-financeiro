"use client";

// Formulário do link de definir senha (capability autenticacao). Depois de
// gravar a senha, entra com ela: a sessão nova é emitida depois da troca e
// continua valendo, enquanto as dos outros aparelhos caem.
//
// No modo "criar" (convite para quem não tem conta), o e-mail aparece só
// para leitura: a conta é criada com o e-mail do convite, no servidor.

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAviso } from "@/components/aviso";
import { Campo, CLASSE_CONTROLE } from "@/components/campo";
import { definirSenha } from "@/lib/actions/senha";
import { useMontado } from "@/lib/hooks/use-montado";

interface DadosConvite {
  email: string;
  grupoNome: string;
  convidadoPor: string;
}

type Estado = { tipo: "formulario" } | { tipo: "invalido" } | { tipo: "entrarPara"; destino: string; mensagem: string };

export function FormularioDefinirSenha({
  token,
  modo,
  convite,
}: {
  token: string;
  modo: "redefinir" | "criar";
  convite?: DadosConvite;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const montado = useMontado();
  const [estado, setEstado] = useState<Estado>({ tipo: "formulario" });
  const [erro, setErro] = useState<{ campo: "nome" | "senha"; mensagem: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const refNome = useRef<HTMLInputElement>(null);
  const refSenha = useRef<HTMLInputElement>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const senha = String(dados.get("senha") ?? "");
    const resultado = await definirSenha(
      token,
      modo === "criar" ? { nome: String(dados.get("nome") ?? ""), senha } : { senha },
    );

    if (!resultado.ok) {
      setEnviando(false);
      if (resultado.linkInvalido) return setEstado({ tipo: "invalido" });
      if (resultado.entrarPara) {
        return setEstado({ tipo: "entrarPara", destino: resultado.entrarPara, mensagem: resultado.erro ?? "" });
      }
      const campo = resultado.campo ?? "senha";
      setErro({ campo, mensagem: resultado.erro ?? "Não foi possível definir a senha." });
      (campo === "nome" ? refNome : refSenha).current?.focus();
      return;
    }

    const login = await signIn("credentials", { email: resultado.email, senha, redirect: false });
    setEnviando(false);
    if (modo === "criar" && convite) avisar(`Você entrou em "${convite.grupoNome}".`);
    router.push(!login || login.error ? "/login" : "/resumo");
    router.refresh();
  }

  if (estado.tipo === "invalido") {
    return (
      <div role="alert" className="flex flex-col gap-3.5">
        <h2>Este link não é mais válido.</h2>
        {modo === "criar" ? (
          <p className="text-suave">Peça um novo convite a quem administra o grupo.</p>
        ) : (
          <Link href="/esqueci-senha" className="botao self-start">
            Pedir um novo link
          </Link>
        )}
      </div>
    );
  }

  if (estado.tipo === "entrarPara") {
    return (
      <div role="alert" className="flex flex-col gap-3.5">
        <h2>{estado.mensagem}</h2>
        <Link href={`/login?retorno=${encodeURIComponent(estado.destino)}`} className="botao self-start">
          Entrar
        </Link>
      </div>
    );
  }

  const erroDe = (campo: "nome" | "senha") => (erro?.campo === campo ? erro.mensagem : undefined);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {convite ? (
          <>
            <h2>Convite para &ldquo;{convite.grupoNome}&rdquo;</h2>
            <p className="text-suave">
              {convite.convidadoPor} convidou você. Crie sua conta para entrar no grupo.
            </p>
          </>
        ) : (
          <>
            <h2>Definir nova senha</h2>
            <p className="text-suave">Escolha uma senha com pelo menos 8 caracteres.</p>
          </>
        )}
      </div>
      <form method="post" noValidate onSubmit={enviar} className="flex flex-col gap-3.5">
        {convite && (
          <>
            <Campo rotulo="E-mail" dica="O e-mail do convite não pode ser trocado.">
              {(props) => <input type="email" value={convite.email} readOnly {...props} className={`${CLASSE_CONTROLE} bg-surface-2`} />}
            </Campo>
            <Campo rotulo="Nome" erro={erroDe("nome")}>
              {(props) => (
                <input
                  ref={refNome}
                  type="text"
                  name="nome"
                  autoComplete="name"
                  placeholder="Como o grupo vai ver você"
                  {...props}
                />
              )}
            </Campo>
          </>
        )}
        <Campo rotulo={convite ? "Senha" : "Nova senha"} erro={erroDe("senha")}>
          {(props) => (
            <input
              ref={refSenha}
              type="password"
              name="senha"
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              {...props}
            />
          )}
        </Campo>
        <button type="submit" className="botao w-full" disabled={enviando || !montado}>
          {convite ? "Criar conta e entrar no grupo" : "Salvar senha e entrar"}
        </button>
      </form>
    </>
  );
}
