import { test, expect, type Page } from "@playwright/test";

// Capability autenticacao — Requirements "Tela de login", "Cadastro de conta",
// "Login por e-mail e senha", "Sessão e logout" e "Proteção de acesso".
// Tarefas 2.5 e 2.6.

test.use({ storageState: { cookies: [], origins: [] } });

const SENHA = "senha-forte-123";

function emailNovo() {
  return `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`;
}

async function criarConta(page: Page, nome: string, email: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Criar conta" }).last().click();
}

async function entrar(page: Page, email: string, senha: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).last().click();
}

test("página interna sem login leva à tela de login", async ({ page }) => {
  await page.goto("/lancamentos");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("group", { name: "Acesso" })).toBeVisible();
});

test("cadastro, saída e login de volta", async ({ page }) => {
  const email = emailNovo();

  await criarConta(page, "Marcelo Souza", email);
  await expect(page).toHaveURL(/\/resumo$/);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Depois de sair, voltar a uma página interna exige entrar de novo (2.6).
  await page.goto("/resumo");
  await expect(page).toHaveURL(/\/login$/);

  await entrar(page, email.toUpperCase(), SENHA);
  await expect(page).toHaveURL(/\/resumo$/);
});

test("senha errada e e-mail inexistente mostram a mesma mensagem, com foco no e-mail", async ({ page }) => {
  const email = emailNovo();
  await criarConta(page, "Ana Lima", email);
  await expect(page).toHaveURL(/\/resumo$/);
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await entrar(page, email, "senha-errada-999");
  const alerta = page.locator("form").getByRole("alert");
  await expect(alerta).toHaveText("E-mail ou senha incorretos.");
  await expect(page.getByLabel("E-mail")).toBeFocused();

  await entrar(page, emailNovo(), SENHA);
  await expect(alerta).toHaveText("E-mail ou senha incorretos.");
});

test("erro do cadastro aparece no campo, com foco nele, e some ao trocar de opção", async ({ page }) => {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill("Pedro");
  await page.getByLabel("E-mail").fill(emailNovo());
  await page.getByLabel("Senha").fill("curta");
  await page.getByRole("button", { name: "Criar conta" }).last().click();

  await expect(page.locator("form").getByRole("alert")).toHaveText("A senha precisa ter pelo menos 8 caracteres.");
  await expect(page.getByLabel("Senha")).toBeFocused();

  await page.getByRole("button", { name: "Entrar" }).first().click();
  await page.getByRole("button", { name: "Criar conta" }).first().click();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
});
