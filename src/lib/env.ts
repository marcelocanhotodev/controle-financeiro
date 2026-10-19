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
// estrutura-base: banco. usuarios-e-grupos: AUTH_SECRET, NEXTAUTH_URL,
// SMTP_* e EMAIL_FROM. Próxima: lancamentos (CRON_SECRET). Ao acrescentar uma variável, atualize
// também .env.example e docs/deploy-producao.md.
// ============================================================================

import { z } from "zod";

// Mesmo valor default usado em docker-compose.yml (dev) — nunca pode
// aparecer em produção.
export const AUTH_SECRET_DEV_DEFAULT = "dev-secret-nao-usar-em-producao";

const connectionStringPostgres = (nome: string) =>
  z
    .string({ required_error: `${nome} é obrigatória.` })
    .min(1, `${nome} é obrigatória.`)
    .regex(
      /^postgres(ql)?:\/\/.+/,
      `${nome} deve ser uma connection string Postgres válida (postgresql://...).`
    );

const envSchema = z
  .object({
    DATABASE_URL: connectionStringPostgres("DATABASE_URL"),
    // Usada só por `prisma migrate` (conexão direta, nunca o connection
    // pooler) — ver comentário no datasource de prisma/schema.prisma.
    DIRECT_URL: connectionStringPostgres("DIRECT_URL"),
    NEXTAUTH_URL: z
      .string({ required_error: "NEXTAUTH_URL é obrigatória." })
      .url("NEXTAUTH_URL deve ser uma URL válida."),
    AUTH_SECRET: z
      .string({ required_error: "AUTH_SECRET é obrigatória." })
      .min(1, "AUTH_SECRET é obrigatória."),
    // Envio de e-mail por SMTP (convites e links de definir senha).
    // Obrigatórias só em produção (checado no superRefine abaixo) — em
    // dev/test, sem elas, o link cai no fallback de log no console (ver
    // src/lib/email.ts).
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  })
  .superRefine((data, ctx) => {
    // Regras mais rígidas só em produção — não muda o comportamento em dev
    // (onde docker-compose.yml usa AUTH_SECRET_DEV_DEFAULT).
    if (data.NODE_ENV !== "production") return;

    if (data.AUTH_SECRET === AUTH_SECRET_DEV_DEFAULT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SECRET"],
        message:
          "AUTH_SECRET não pode usar o valor default de desenvolvimento em produção — gere um valor exclusivo com: openssl rand -base64 32.",
      });
    } else if (data.AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET deve ter pelo menos 32 caracteres em produção — gere com: openssl rand -base64 32.",
      });
    }

    const smtpObrigatorias: [keyof typeof data, string][] = [
      ["SMTP_HOST", "host do servidor SMTP (Gmail: smtp.gmail.com)"],
      ["SMTP_PORT", "porta do servidor SMTP (Gmail: 465)"],
      ["SMTP_USER", "usuário da conta de envio (no Gmail, o próprio endereço)"],
      ["SMTP_PASS", "senha do SMTP (no Gmail, uma senha de app de 16 caracteres)"],
      ["EMAIL_FROM", "remetente, ex.: Caixa Comum <conta@gmail.com> (no Gmail, o mesmo endereço de SMTP_USER)"],
    ];
    for (const [variavel, descricao] of smtpObrigatorias) {
      if (!data[variavel]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [variavel],
          message: `${variavel} é obrigatória em produção (${descricao}) — sem ela, convites e links de definir senha não conseguem ser enviados. Veja docs/deploy-producao.md, seção de e-mail.`,
        });
      }
    }
    if (data.SMTP_PORT && !/^\d{1,5}$/.test(data.SMTP_PORT)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_PORT"],
        message: "SMTP_PORT deve ser um número de porta (ex.: 465 ou 587).",
      });
    }
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
