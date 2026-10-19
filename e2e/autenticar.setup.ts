import { test as setup, expect } from "@playwright/test";

// Projeto "autenticacao" do playwright.config.ts: cria uma conta nova pela
// tela "Criar conta" e guarda a sessão em e2e/.auth/pessoa.json. Os projetos
// "celular" e "desktop" partem dessa sessão, porque toda página interna exige
// login (capability autenticacao, Requirement "Proteção de acesso").
//
// Testes que precisam começar sem sessão usam
// `test.use({ storageState: { cookies: [], origins: [] } })`.

// Mesmo caminho de ARQUIVO_SESSAO em playwright.config.ts.
const ARQUIVO_SESSAO = "e2e/.auth/pessoa.json";

setup("criar conta e guardar a sessão", async ({ page }) => {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill("Pessoa dos Testes");
  await page.getByLabel("E-mail").fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`);
  await page.getByLabel("Senha").fill("senha-dos-testes-123");
  await page.getByRole("button", { name: "Criar conta" }).last().click();

  await expect(page).toHaveURL(/\/resumo$/);
  await page.context().storageState({ path: ARQUIVO_SESSAO });
});
