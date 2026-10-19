// Testes de src/lib/email.ts — fallback de log em dev (sem SMTP) e envio via
// nodemailer mockado (nunca abre conexão real). Modelo: email.test.ts do
// matilha-app.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendMailMock = vi.fn();
const closeMock = vi.fn();
const createTransportMock = vi.fn((_opcoes: Record<string, unknown>) => ({ sendMail: sendMailMock, close: closeMock }));

vi.mock("nodemailer", () => ({ default: { createTransport: createTransportMock } }));

const { enviarConvite, enviarRedefinicaoSenha } = await import("@/lib/email");

const PARAMS = { email: "ana@exemplo.com", nome: "Ana Lima", link: "http://localhost:3000/definir-senha/abc123" };
const VARIAVEIS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] as const;

describe("envio de e-mail", () => {
  const originais = Object.fromEntries(VARIAVEIS.map((v) => [v, process.env[v]]));

  function configurarGmail() {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "caixa.comum@gmail.com";
    process.env.SMTP_PASS = "abcd efgh ijkl mnop";
    process.env.EMAIL_FROM = "Caixa Comum <caixa.comum@gmail.com>";
  }

  beforeEach(() => {
    for (const v of VARIAVEIS) delete process.env[v];
    sendMailMock.mockReset().mockResolvedValue({ messageId: "x" });
    closeMock.mockReset();
    createTransportMock.mockClear();
  });

  afterEach(() => {
    for (const v of VARIAVEIS) {
      if (originais[v] === undefined) delete process.env[v];
      else process.env[v] = originais[v];
    }
    vi.restoreAllMocks();
  });

  it("sem SMTP configurado, imprime o link no console em vez de enviar", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await enviarRedefinicaoSenha(PARAMS);

    expect(createTransportMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(PARAMS.link));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(PARAMS.email));
  });

  it("com SMTP, envia com TLS na 465, timeouts, link e validade de 1 hora", async () => {
    configurarGmail();

    await enviarRedefinicaoSenha(PARAMS);

    expect(createTransportMock).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "caixa.comum@gmail.com", pass: "abcd efgh ijkl mnop" },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    const mensagem = sendMailMock.mock.calls[0][0];
    expect(mensagem).toMatchObject({
      from: "Caixa Comum <caixa.comum@gmail.com>",
      to: PARAMS.email,
      subject: "Redefinição de senha — Caixa Comum",
    });
    expect(mensagem.html).toContain(PARAMS.link);
    expect(mensagem.text).toContain(PARAMS.link);
    expect(mensagem.text).toContain("1 hora");
    expect(closeMock).toHaveBeenCalled();
  });

  it("porta 587 usa STARTTLS e EMAIL_FROM ausente cai no SMTP_USER", async () => {
    configurarGmail();
    process.env.SMTP_PORT = "587";
    delete process.env.EMAIL_FROM;

    await enviarRedefinicaoSenha(PARAMS);

    expect(createTransportMock.mock.calls[0][0]).toMatchObject({ port: 587, secure: false });
    expect(sendMailMock.mock.calls[0][0].from).toBe("Caixa Comum <caixa.comum@gmail.com>");
  });

  it("credencial recusada (EAUTH) lança erro com dica e sem a senha", async () => {
    configurarGmail();
    sendMailMock.mockRejectedValueOnce(
      Object.assign(new Error("Invalid login: 535 bad credentials for abcd efgh ijkl mnop"), { code: "EAUTH" }),
    );

    const promessa = enviarRedefinicaoSenha(PARAMS);

    await expect(promessa).rejects.toThrow("Credenciais SMTP recusadas");
    await expect(promessa).rejects.not.toThrow("abcd efgh ijkl mnop");
    expect(closeMock).toHaveBeenCalled();
  });

  it("escapa o nome no HTML", async () => {
    configurarGmail();
    await enviarRedefinicaoSenha({ ...PARAMS, nome: "<script>alert(1)</script>" });
    expect(sendMailMock.mock.calls[0][0].html).not.toContain("<script>");
  });

  it("convite: nome do grupo, quem convidou, link, validade e Responder para quem convidou", async () => {
    configurarGmail();
    const convite = {
      email: "pedro@exemplo.com",
      grupoNome: "Finanças da Casa",
      convidadoPor: "Marcelo",
      link: "http://localhost:3000/convite/tok123",
      expiraEm: new Date("2026-10-26T15:00:00Z"),
      criarConta: false,
      replyTo: "marcelo@exemplo.com",
    };

    await enviarConvite(convite);

    const mensagem = sendMailMock.mock.calls[0][0];
    expect(mensagem).toMatchObject({ to: "pedro@exemplo.com", replyTo: "marcelo@exemplo.com" });
    expect(mensagem.subject).toContain("Finanças da Casa");
    for (const parte of [mensagem.text, mensagem.html]) {
      expect(parte).toContain("Finanças da Casa");
      expect(parte).toContain("Marcelo");
      expect(parte).toContain(convite.link);
      expect(parte).toContain("26/10/2026");
    }
  });

  it("convite para quem não tem conta orienta a criar a conta pelo link", async () => {
    configurarGmail();
    await enviarConvite({
      email: "joana@exemplo.com",
      grupoNome: "Casa",
      convidadoPor: "Ana",
      link: "http://localhost:3000/definir-senha/abc",
      expiraEm: new Date("2026-10-26T15:00:00Z"),
      criarConta: true,
      replyTo: "ana@exemplo.com",
    });
    expect(sendMailMock.mock.calls[0][0].text).toContain("crie sua conta");
  });

  it("convite sem SMTP imprime o link no console", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await enviarConvite({
      email: "pedro@exemplo.com",
      grupoNome: "Casa",
      convidadoPor: "Ana",
      link: "http://localhost:3000/convite/tok-console",
      expiraEm: new Date(),
      criarConta: false,
      replyTo: "ana@exemplo.com",
    });
    expect(createTransportMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/convite/tok-console"));
  });
});
