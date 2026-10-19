import { readFileSync } from "node:fs";
import { expect } from "@playwright/test";

// Leitura dos e-mails capturados pelo e2e/smtp-falso.mjs.

const ARQUIVO = "e2e/.emails/caixa-de-entrada.jsonl";

interface EmailCapturado {
  para: string[];
  dados: string;
}

function lerEmails(): EmailCapturado[] {
  try {
    return readFileSync(ARQUIVO, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((linha) => JSON.parse(linha) as EmailCapturado);
  } catch {
    return [];
  }
}

/** Texto legível de uma mensagem MIME: desfaz quoted-printable e decodifica
 * as partes em base64, o suficiente para achar um link nela. */
function textoLegivel(dados: string): string {
  const quotedPrintable = dados.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  const partesBase64 = [...dados.matchAll(/base64\r?\n\r?\n([A-Za-z0-9+/=\r\n]+)/g)].map(([, bloco]) =>
    Buffer.from(bloco.replace(/\r?\n/g, ""), "base64").toString("utf8"),
  );
  return [quotedPrintable, ...partesBase64].join("\n");
}

/** Espera chegar um e-mail para `para` com um link que case com `padrao` e
 * devolve o caminho do link (ex.: "/definir-senha/abc..."). Pega sempre o
 * e-mail mais recente. */
export async function esperarLink(para: string, padrao: RegExp): Promise<string> {
  let caminho: string | undefined;
  await expect
    .poll(
      () => {
        const emails = lerEmails().filter((email) => email.para.includes(para.toLowerCase()));
        for (const email of emails.reverse()) {
          const achado = padrao.exec(textoLegivel(email.dados));
          if (achado) {
            caminho = achado[0];
            return true;
          }
        }
        return false;
      },
      { message: `e-mail para ${para} com link ${padrao}`, timeout: 15_000 },
    )
    .toBe(true);
  return caminho!;
}

/** Quantos e-mails chegaram para `para` até agora. */
export function contarEmails(para: string): number {
  return lerEmails().filter((email) => email.para.includes(para.toLowerCase())).length;
}
