// Partes comuns dos e-mails transacionais (convite e link de definir senha).
// HTML em tabela com estilos inline, o formato que Gmail e Outlook mostram de
// forma consistente, nas cores do Caixa Comum. Todo texto variável passa por
// `escaparHtml` e nunca vira marcação. Modelo: src/lib/email/*-template.ts do
// matilha-app.

export interface EmailMontado {
  assunto: string;
  html: string;
  texto: string;
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Primeiro nome, para a saudação. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

/** Monta o HTML: `corpo` e `rodape` já chegam escapados; `link` e `rotuloBotao` são escapados aqui. */
export function montarHtml({
  corpo,
  rotuloBotao,
  link,
  rodape,
}: {
  corpo: string;
  rotuloBotao: string;
  link: string;
  rodape: string;
}): string {
  const href = escaparHtml(link);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#eef1f0;font-family:Arial,Helvetica,sans-serif;color:#15201d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f0;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:10px;border:1px solid #d2dad7;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <div style="font-size:20px;font-weight:bold;color:#2b47c9;">Caixa Comum</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-size:15px;line-height:1.5;">${corpo}</td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 20px;">
              <a href="${href}" style="display:inline-block;background:#2b47c9;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:8px;">${escaparHtml(rotuloBotao)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;font-size:13px;line-height:1.5;color:#586763;">
              ${rodape}
              <p style="margin:0;">Se o botão não funcionar, copie e cole este endereço no navegador:<br /><a href="${href}" style="color:#586763;word-break:break-all;">${href}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
