import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta (acréscimo ao padrão do matilha-app — ver
// openspec/changes/estrutura-base/design.md, "Testes com Vitest e
// Playwright"). Rodam contra `next start` (build de produção), em dois
// projetos: celular (390 px, a largura de referência do protótipo) e desktop.
// Só Chromium nos dois, para o CI instalar um navegador só.
//
// No CI, o workflow já roda `npm run build` antes; localmente o webServer
// faz o build sozinho (ou reaproveita um servidor já aberto na porta 3000).
const PORTA = 3000;

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
      name: "celular",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run build && npm run start",
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    // Liga as páginas de exemplo de src/app/teste/, que devolvem 404 sem isso.
    env: { PAGINAS_DE_TESTE: "1" },
  },
});
