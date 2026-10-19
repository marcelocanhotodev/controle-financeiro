import { describe, it, expect, vi, afterEach } from "vitest";
import { parseEnv, assertEnv, AUTH_SECRET_DEV_DEFAULT, type Env } from "@/lib/env";

// Base de env válida, reutilizada e sobrescrita por cada teste.
const ENV_VALIDO: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/caixa_comum?schema=public",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/caixa_comum?schema=public",
  NEXTAUTH_URL: "http://localhost:3000",
  AUTH_SECRET: "x".repeat(40),
  NODE_ENV: "development",
};

// Produção completa e válida: AUTH_SECRET forte e todas as SMTP_*.
const ENV_PRODUCAO: NodeJS.ProcessEnv = {
  ...ENV_VALIDO,
  NODE_ENV: "production",
  AUTH_SECRET: "y".repeat(44),
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "465",
  SMTP_USER: "caixa.comum@gmail.com",
  SMTP_PASS: "senha-de-app-teste",
  EMAIL_FROM: "Caixa Comum <caixa.comum@gmail.com>",
};

function sem(source: NodeJS.ProcessEnv, variavel: string): NodeJS.ProcessEnv {
  const copia = { ...source };
  delete copia[variavel];
  return copia;
}

function mensagensPara(source: NodeJS.ProcessEnv) {
  const result = parseEnv(source);
  if (result.success) return null;
  return result.issues;
}

describe("parseEnv", () => {
  it("aceita todas as variáveis obrigatórias presentes e válidas", () => {
    const result = parseEnv(ENV_VALIDO);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(ENV_VALIDO.DATABASE_URL);
      expect(result.data.DIRECT_URL).toBe(ENV_VALIDO.DIRECT_URL);
    }
  });

  it("falha quando DATABASE_URL está ausente, identificando a variável", () => {
    const { DATABASE_URL: _omit, ...semDatabaseUrl } = ENV_VALIDO;
    const issues = mensagensPara(semDatabaseUrl);
    expect(issues).not.toBeNull();
    expect(issues?.some((i) => i.variable === "DATABASE_URL")).toBe(true);
  });

  it("falha quando DIRECT_URL está ausente, identificando a variável", () => {
    const { DIRECT_URL: _omit, ...semDirectUrl } = ENV_VALIDO;
    const issues = mensagensPara(semDirectUrl);
    expect(issues?.some((i) => i.variable === "DIRECT_URL")).toBe(true);
  });

  it("falha quando DATABASE_URL não é uma connection string Postgres válida", () => {
    const issues = mensagensPara({ ...ENV_VALIDO, DATABASE_URL: "nao-e-uma-url" });
    expect(issues?.some((i) => i.variable === "DATABASE_URL")).toBe(true);
  });

  it("falha quando DIRECT_URL não é uma connection string Postgres válida", () => {
    const issues = mensagensPara({ ...ENV_VALIDO, DIRECT_URL: "mysql://localhost/caixa" });
    expect(issues?.some((i) => i.variable === "DIRECT_URL")).toBe(true);
  });

  it.each(["AUTH_SECRET", "NEXTAUTH_URL"])("falha quando %s está ausente, identificando a variável", (variavel) => {
    const issues = mensagensPara(sem(ENV_VALIDO, variavel));
    expect(issues?.some((i) => i.variable === variavel)).toBe(true);
  });

  it("falha quando NEXTAUTH_URL não é uma URL válida", () => {
    const issues = mensagensPara({ ...ENV_VALIDO, NEXTAUTH_URL: "localhost" });
    expect(issues?.some((i) => i.variable === "NEXTAUTH_URL")).toBe(true);
  });

  it("aceita o AUTH_SECRET default de dev e a ausência de SMTP_* / EMAIL_FROM fora de produção", () => {
    const result = parseEnv({ ...ENV_VALIDO, AUTH_SECRET: AUTH_SECRET_DEV_DEFAULT });
    expect(result.success).toBe(true);
  });

  it("aceita produção com AUTH_SECRET forte e todas as SMTP_* / EMAIL_FROM", () => {
    expect(parseEnv(ENV_PRODUCAO).success).toBe(true);
  });

  it("falha quando AUTH_SECRET usa o valor default de dev em produção", () => {
    const issues = mensagensPara({ ...ENV_PRODUCAO, AUTH_SECRET: AUTH_SECRET_DEV_DEFAULT });
    expect(issues?.some((i) => i.variable === "AUTH_SECRET")).toBe(true);
  });

  it("falha quando AUTH_SECRET tem menos de 32 caracteres em produção", () => {
    const issues = mensagensPara({ ...ENV_PRODUCAO, AUTH_SECRET: "curto-demais" });
    expect(issues?.some((i) => i.variable === "AUTH_SECRET")).toBe(true);
  });

  it.each(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"])(
    "falha quando %s está ausente em produção",
    (variavel) => {
      const issues = mensagensPara(sem(ENV_PRODUCAO, variavel));
      expect(issues?.some((i) => i.variable === variavel)).toBe(true);
    },
  );

  it("falha quando SMTP_PORT não é um número de porta", () => {
    const issues = mensagensPara({ ...ENV_PRODUCAO, SMTP_PORT: "smtp" });
    expect(issues?.some((i) => i.variable === "SMTP_PORT")).toBe(true);
  });
});

describe("assertEnv", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna os valores tipados quando o ambiente é válido, sem encerrar o processo", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit não deveria ser chamado aqui");
    });

    const env: Env = assertEnv(ENV_VALIDO);

    expect(env.DATABASE_URL).toBe(ENV_VALIDO.DATABASE_URL);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("loga a variável problemática (nunca o valor) e encerra o processo quando o ambiente é inválido", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((): never => {
      throw new Error("PROCESS_EXIT_CHAMADO");
    });

    const valorInvalido = "valor-que-nunca-pode-aparecer-no-log-12345";

    expect(() => assertEnv({ ...ENV_VALIDO, DIRECT_URL: valorInvalido })).toThrow("PROCESS_EXIT_CHAMADO");

    expect(exitSpy).toHaveBeenCalledWith(1);
    const logado = errorSpy.mock.calls.flat().join("\n");
    expect(logado).toContain("DIRECT_URL");
    expect(logado).not.toContain(valorInvalido);
  });
});
