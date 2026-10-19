import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta (acréscimo ao padrão do matilha-app — ver
// openspec/changes/estrutura-base/design.md, "Testes com Vitest e
// Playwright"). Rodam contra `next start` (build de produção), em dois
// projetos: celular (390 px, a largura de referência do protótipo) e desktop.
// Só Chromium nos dois, para o CI instalar um navegador só.
//
// No CI, o workflow já roda `npm run build` antes; localmente o webServer
// faz o build sozinho (ou reaproveita um servidor já aberto na porta 3000).
//
// Toda página interna exige login: o projeto "autenticacao" cria uma conta
// e guarda a sessão (e2e/autenticar.setup.ts), e os dois projetos partem dela.
const PORTA = 3000;
const ARQUIVO_SESSAO = "e2e/.auth/pessoa.json";
const PORTA_SMTP = 2525;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "autenticacao",
      testMatch: /autenticar\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "celular",
      dependencies: ["autenticacao"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: ARQUIVO_SESSAO,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      dependencies: ["autenticacao"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, storageState: ARQUIVO_SESSAO },
    },
  ],
  webServer: [
    // SMTP falso: recebe os e-mails do app para os testes lerem os links
    // (e2e/smtp-falso.mjs, e2e/caixa-de-entrada.ts).
    {
      command: "node e2e/smtp-falso.mjs",
      port: PORTA_SMTP,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: process.env.CI ? "npm run start" : "npm run build && npm run start",
      url: `http://localhost:${PORTA}`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        // Liga as páginas de exemplo de src/app/teste/, que devolvem 404 sem isso.
        PAGINAS_DE_TESTE: "1",
        // `next start` roda com NODE_ENV=production, e src/lib/env.ts exige
        // estas variáveis em produção. Valores só de teste; o SMTP é o falso.
        AUTH_SECRET: process.env.AUTH_SECRET ?? "segredo-dos-testes-e2e-com-mais-de-32-caracteres",
        NEXTAUTH_URL: `http://localhost:${PORTA}`,
        SMTP_HOST: "localhost",
        SMTP_PORT: String(PORTA_SMTP),
        SMTP_USER: "e2e@caixa.test",
        SMTP_PASS: "e2e",
        EMAIL_FROM: "Caixa Comum <e2e@caixa.test>",
      },
    },
  ],
});
