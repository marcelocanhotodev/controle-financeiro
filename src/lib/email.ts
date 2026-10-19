// ============================================================================
// Envio de e-mail transacional por SMTP: convites para grupos e links de
// definir senha. Cópia adaptada de src/lib/email.ts do matilha-app — SMTP
// genérico via nodemailer, qualquer provedor serve só trocando variáveis de
// ambiente (passo a passo em docs/deploy-producao.md, seção 2.1).
//
// Sem SMTP configurado (o caso normal em dev — src/lib/env.ts só exige em
// produção), o link é impresso no console do servidor, para rodar local sem
// credencial real.
// ============================================================================

import nodemailer from "nodemailer";
import { montarEmailConvite, type DadosEmailConvite } from "@/lib/email/convite";
import { montarEmailRedefinicaoSenha } from "@/lib/email/redefinicao-senha";

// Uma falha de rede nunca pode prender a função serverless até o timeout da
// plataforma.
const TIMEOUT_MS = 10_000;

interface ConfigSmtp {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

/** Lida a cada envio (não no import), para refletir o ambiente atual. */
function configSmtp(): ConfigSmtp | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: EMAIL_FROM || `Caixa Comum <${SMTP_USER}>`,
  };
}

/** Mensagem de erro para log e para `Convite.envioErro` — nunca inclui a
 * senha, e dá uma dica quando o servidor recusa as credenciais. */
function mensagemDeErro(erro: unknown, config: ConfigSmtp): string {
  const codigo = (erro as { code?: string } | null)?.code;
  const bruta = erro instanceof Error ? erro.message : String(erro);
  const semSenha = bruta.split(config.pass).join("***");
  if (codigo === "EAUTH") {
    return `Credenciais SMTP recusadas — confira SMTP_USER/SMTP_PASS (no Gmail, use uma senha de app). Detalhe: ${semSenha}`;
  }
  return semSenha;
}

export interface MensagemEmail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  replyTo?: string;
}

/** Envio compartilhado por todos os e-mails. Sem SMTP, só registra no console.
 * Lança `Error` com a mensagem pronta quando o servidor SMTP recusa ou falha. */
export async function enviarEmail(mensagem: MensagemEmail, linkParaLog: string): Promise<void> {
  const config = configSmtp();
  if (!config) {
    console.log(`[email] (dev) "${mensagem.assunto}" para ${mensagem.para}: ${linkParaLog}`);
    return;
  }

  const transporte = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 = TLS direto; qualquer outra porta (587) sobe para TLS via STARTTLS.
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });

  try {
    await transporte.sendMail({
      from: config.from,
      to: mensagem.para,
      ...(mensagem.replyTo ? { replyTo: mensagem.replyTo } : {}),
      subject: mensagem.assunto,
      html: mensagem.html,
      text: mensagem.texto,
    });
  } catch (erro) {
    throw new Error(mensagemDeErro(erro, config));
  } finally {
    transporte.close();
  }
}

/** Link de definir senha do "Esqueci minha senha". Lança `Error` quando o
 * SMTP falha — quem chama decide não revelar isso a quem pediu. */
export async function enviarRedefinicaoSenha(params: { email: string; nome: string; link: string }): Promise<void> {
  const { assunto, html, texto } = montarEmailRedefinicaoSenha(params);
  await enviarEmail({ para: params.email, assunto, html, texto }, params.link);
}

/** Convite para um grupo. `replyTo` é o e-mail de quem convidou: "Responder"
 * vai para essa pessoa, não para a conta de envio do sistema. Lança `Error`
 * quando o SMTP falha — o convite fica registrado como FALHOU. */
export async function enviarConvite(params: DadosEmailConvite & { email: string; replyTo: string }): Promise<void> {
  const { assunto, html, texto } = montarEmailConvite(params);
  await enviarEmail({ para: params.email, assunto, html, texto, replyTo: params.replyTo }, params.link);
}
