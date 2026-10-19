// Servidor SMTP falso dos testes de ponta a ponta. O playwright.config.ts o
// sobe junto com o app e aponta SMTP_HOST/SMTP_PORT para ele, então o app usa
// o caminho real de envio (nodemailer), sem nenhum desvio no código.
//
// Cada mensagem recebida vira uma linha JSON ({ para, dados }) em
// e2e/.emails/caixa-de-entrada.jsonl, lida por e2e/caixa-de-entrada.ts — é
// assim que os testes pegam os links de definir senha e de convite, que o
// banco só guarda como hash.
//
// Implementa o mínimo do protocolo que o nodemailer usa: EHLO (anunciando
// AUTH PLAIN, sem STARTTLS), AUTH, MAIL, RCPT, DATA e QUIT.

import { createServer } from "node:net";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const PORTA = Number(process.env.SMTP_FALSO_PORTA ?? 2525);
const ARQUIVO = "e2e/.emails/caixa-de-entrada.jsonl";

mkdirSync(dirname(ARQUIVO), { recursive: true });
writeFileSync(ARQUIVO, "");

createServer((socket) => {
  socket.setEncoding("utf8");
  let buffer = "";
  let emDados = false;
  let para = [];
  const responder = (linha) => socket.write(`${linha}\r\n`);

  responder("220 smtp-falso pronto");

  socket.on("data", (pedaco) => {
    buffer += pedaco;
    for (;;) {
      if (emDados) {
        const fim = buffer.indexOf("\r\n.\r\n");
        if (fim < 0) return;
        appendFileSync(ARQUIVO, `${JSON.stringify({ para, dados: buffer.slice(0, fim) })}\n`);
        buffer = buffer.slice(fim + 5);
        emDados = false;
        para = [];
        responder("250 OK");
        continue;
      }

      const quebra = buffer.indexOf("\r\n");
      if (quebra < 0) return;
      const linha = buffer.slice(0, quebra);
      buffer = buffer.slice(quebra + 2);
      const comando = linha.split(" ")[0].toUpperCase();

      if (comando === "EHLO") socket.write("250-smtp-falso\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n");
      else if (comando === "AUTH") responder("235 Autenticado");
      else if (comando === "RCPT") {
        const endereco = /<([^>]*)>/.exec(linha)?.[1];
        if (endereco) para.push(endereco.toLowerCase());
        responder("250 OK");
      } else if (comando === "DATA") {
        emDados = true;
        responder("354 Pode enviar");
      } else if (comando === "QUIT") {
        responder("221 Tchau");
        socket.end();
        return;
      } else responder("250 OK");
    }
  });
  socket.on("error", () => {});
}).listen(PORTA, () => {
  console.log(`[smtp-falso] ouvindo na porta ${PORTA}`);
});
