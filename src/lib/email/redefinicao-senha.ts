// E-mail do "Esqueci minha senha" (capability: autenticacao, Requirement
// "Recuperação de senha"): link de definir senha válido por 1 hora.

import { escaparHtml, montarHtml, primeiroNome, type EmailMontado } from "@/lib/email/modelo";

export function montarEmailRedefinicaoSenha({ nome, link }: { nome: string; link: string }): EmailMontado {
  const saudacao = primeiroNome(nome);
  const assunto = "Redefinição de senha — Caixa Comum";

  const texto = [
    `Olá, ${saudacao}.`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no Caixa Comum. Para criar uma nova senha, acesse:",
    link,
    "",
    "O link vale por 1 hora e só pode ser usado uma vez.",
    "",
    "Se não foi você que pediu, ignore este e-mail. Sua senha atual continua valendo.",
  ].join("\n");

  const html = montarHtml({
    corpo: `<p style="margin:0 0 12px;">Olá, <strong>${escaparHtml(saudacao)}</strong>.</p>
              <p style="margin:0 0 20px;">Recebemos um pedido para redefinir a senha da sua conta no Caixa Comum. Toque no botão abaixo para criar uma nova senha.</p>`,
    rotuloBotao: "Definir nova senha",
    link,
    rodape: `<p style="margin:0 0 8px;">O link vale por <strong>1 hora</strong> e só pode ser usado uma vez.</p>
              <p style="margin:0 0 8px;">Se não foi você que pediu, ignore este e-mail. Sua senha atual continua valendo.</p>`,
  });

  return { assunto, html, texto };
}
