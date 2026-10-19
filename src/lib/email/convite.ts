// E-mail de convite para um grupo (capability: grupos, Requirement "Convite
// por e-mail"): nome do grupo, quem convidou, o link e a validade. O link é o
// do convite, para quem já tem conta, ou o de definir senha, para quem ainda
// não tem — ver design.md, "Convite por link com token para todo mundo".

import { escaparHtml, montarHtml, type EmailMontado } from "@/lib/email/modelo";

export interface DadosEmailConvite {
  grupoNome: string;
  convidadoPor: string;
  link: string;
  expiraEm: Date;
  /** true quando o link é de definir senha (a pessoa ainda não tem conta). */
  criarConta: boolean;
}

/** Data no calendário de São Paulo, como "26/10/2026". */
export function formatarValidade(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(data);
}

export function montarEmailConvite({ grupoNome, convidadoPor, link, expiraEm, criarConta }: DadosEmailConvite): EmailMontado {
  const validade = formatarValidade(expiraEm);
  const assunto = `${convidadoPor} convidou você para "${grupoNome}" — Caixa Comum`;
  const instrucao = criarConta
    ? "Para entrar, crie sua conta: informe seu nome e escolha uma senha pelo link abaixo."
    : "Para entrar no grupo, abra o link abaixo com a sua conta.";

  const texto = [
    `${convidadoPor} convidou você para o grupo "${grupoNome}" no Caixa Comum, onde o grupo registra entradas e saídas num só lugar.`,
    "",
    instrucao,
    link,
    "",
    `O convite vale até ${validade}.`,
    "",
    "Se você não esperava este convite, ignore este e-mail.",
  ].join("\n");

  const html = montarHtml({
    corpo: `<p style="margin:0 0 12px;"><strong>${escaparHtml(convidadoPor)}</strong> convidou você para o grupo <strong>${escaparHtml(grupoNome)}</strong> no Caixa Comum, onde o grupo registra entradas e saídas num só lugar.</p>
              <p style="margin:0 0 20px;">${escaparHtml(instrucao)}</p>`,
    rotuloBotao: criarConta ? "Criar conta e entrar no grupo" : "Entrar no grupo",
    link,
    rodape: `<p style="margin:0 0 8px;">O convite vale até <strong>${escaparHtml(validade)}</strong>.</p>
              <p style="margin:0 0 8px;">Se você não esperava este convite, ignore este e-mail.</p>`,
  });

  return { assunto, html, texto };
}
