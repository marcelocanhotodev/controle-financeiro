import { describe, it, expect, vi, afterEach } from "vitest";
import { parseEnv, assertEnv, type Env } from "@/lib/env";

// Base de env válida, reutilizada e sobrescrita por cada teste.
const ENV_VALIDO: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/caixa_comum?schema=public",
  DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/caixa_comum?schema=public",
  NODE_ENV: "development",
};

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
