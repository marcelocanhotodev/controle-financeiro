import { test, expect, type Page } from "@playwright/test";
import { esperarLink } from "./caixa-de-entrada";

// Capability autenticacao — Requirements "Recuperação de senha", "Link de
// definir senha" e "Sessões encerradas ao redefinir a senha". Tarefa 2.11.

test.use({ storageState: { cookies: [], origins: [] } });

const LINK_DEFINIR_SENHA = /\/definir-senha\/[0-9a-f]{64}/;

async function criarConta(page: Page, email: string, senha: string) {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill("Ana Lima");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page).toHaveURL(/\/resumo$/);
}

async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).last().click();
}

test("redefinir a senha pelo link encerra a sessão do outro aparelho", async ({ browser }) => {
  const email = `e2e-redefinir-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`;

  // "Notebook": autenticado antes da redefinição.
  const notebook = await (await browser.newContext()).newPage();
  await criarConta(notebook, email, "senha-antiga-123");

  // "Celular": pede o link pela tela de login.
  const celular = await (await browser.newContext()).newPage();
  await celular.goto("/login");
  await celular.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(celular.getByRole("heading", { name: "Esqueci minha senha" })).toBeVisible();
  await celular.getByLabel("E-mail").fill(email.toUpperCase());
  await celular.getByRole("button", { name: "Enviar link" }).click();
  await expect(celular.getByText("Se houver uma conta com este e-mail, enviamos um link.")).toBeVisible();

  const link = await esperarLink(email, LINK_DEFINIR_SENHA);
  await celular.goto(link);
  await celular.getByLabel("Nova senha").fill("senha-nova-456");
  await celular.getByRole("button", { name: "Salvar senha e entrar" }).click();
  await expect(celular).toHaveURL(/\/resumo$/);

  // O celular continua autenticado; o notebook cai na próxima página.
  await celular.reload();
  await expect(celular).toHaveURL(/\/resumo$/);
  await notebook.goto("/lancamentos");
  await expect(notebook).toHaveURL(/\/login$/);

  // A senha antiga deixou de valer; a nova vale.
  await entrar(notebook, email, "senha-antiga-123");
  await expect(notebook.locator("form").getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
  await entrar(notebook, email, "senha-nova-456");
  await expect(notebook).toHaveURL(/\/resumo$/);

  // O link é de uso único.
  await celular.goto(link);
  await expect(celular.getByRole("heading", { name: "Este link não é mais válido." })).toBeVisible();
  await expect(celular.getByRole("link", { name: "Pedir um novo link" })).toBeVisible();
});

test("link inexistente mostra que não é mais válido", async ({ page }) => {
  await page.goto(`/definir-senha/${"f".repeat(64)}`);
  await expect(page.getByRole("heading", { name: "Este link não é mais válido." })).toBeVisible();
});

test("pedido para e-mail sem conta mostra a mesma mensagem", async ({ page }) => {
  await page.goto("/esqueci-senha");
  await page.getByLabel("E-mail").fill(`ninguem-${Date.now()}@caixa.test`);
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText("Se houver uma conta com este e-mail, enviamos um link.")).toBeVisible();
});
