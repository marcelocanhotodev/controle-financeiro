// ============================================================================
// Validação das variáveis de ambiente obrigatórias — fonte única de verdade.
// Modelo: src/lib/env.ts do matilha-app.
//
// `assertEnv()` é chamada uma única vez por `src/instrumentation.ts` quando o
// servidor Next.js sobe (runtime Node, nunca no bundle de Edge). Se alguma
// variável obrigatória estiver ausente ou inválida, o processo é encerrado
// (`process.exit(1)`) com uma mensagem que identifica a variável e o motivo —
// nunca o valor.
//
// Change estrutura-base: só o banco. Cada change seguinte acrescenta as
// próprias variáveis aqui (usuarios-e-grupos: AUTH_SECRET, NEXTAUTH_URL,
// SMTP_*; lancamentos: CRON_SECRET). Ao acrescentar uma variável, atualize
// também .env.example e docs/deploy-producao.md.
// ============================================================================

import { z } from "zod";

const connectionStringPostgres = (nome: string) =>
  z
    .string({ required_error: `${nome} é obrigatória.` })
    .min(1, `${nome} é obrigatória.`)
    .regex(
      /^postgres(ql)?:\/\/.+/,
      `${nome} deve ser uma connection string Postgres válida (postgresql://...).`
    );

const envSchema = z.object({
  DATABASE_URL: connectionStringPostgres("DATABASE_URL"),
  // Usada só por `prisma migrate` (conexão direta, nunca o connection
  // pooler) — ver comentário no datasource de prisma/schema.prisma.
  DIRECT_URL: connectionStringPostgres("DIRECT_URL"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export type EnvIssue = { variable: string; message: string };

export type EnvParseResult = { success: true; data: Env } | { success: false; issues: EnvIssue[] };

/**
 * Valida uma fonte de variáveis de ambiente contra o schema. Função pura —
 * não lê `process.env` sozinha nem encerra o processo — usada tanto por
 * `assertEnv()` quanto diretamente pelos testes.
 */
export function parseEnv(source: NodeJS.ProcessEnv): EnvParseResult {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues.map((issue) => ({
    variable: issue.path.join(".") || "(desconhecida)",
    message: issue.message,
  }));
  return { success: false, issues };
}

function formatIssues(issues: EnvIssue[]): string {
  return [
    "",
    "[env] Configuração de ambiente inválida — o processo não pode iniciar:",
    "",
    ...issues.map((issue) => `  - ${issue.variable}: ${issue.message}`),
    "",
    "Veja .env.example e docs/deploy-producao.md para como configurar cada variável.",
    "",
  ].join("\n");
}

/**
 * Valida `process.env` (ou a fonte passada) e encerra o processo
 * (`process.exit(1)`) se algo obrigatório estiver ausente ou inválido.
 * Retorna os valores validados e tipados quando está tudo OK.
 */
export function assertEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = parseEnv(source);
  if (!result.success) {
    console.error(formatIssues(result.issues));
    process.exit(1);
  }
  return result.data;
}
