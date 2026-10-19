import { test, expect, type Page } from "@playwright/test";
import { banco, criarGrupoCom, idDaConta } from "./banco";

// Capability grupos — Requirements "Seletor de grupo e pessoa no topo" e
// "Lista de grupos e grupo ativo". Tarefas 3.1 (aviso de troca) e 3.4.

test.use({ storageState: { cookies: [], origins: [] } });

async function criarConta(page: Page, nome: string): Promise<string> {
  const email = `e2e-topo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`;
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page).toHaveURL(/\/resumo$/);
  return email;
}

test.afterAll(async () => {
  await banco.$disconnect();
});

test("o topo mostra o seletor com os grupos, a pessoa e o botão Sair; a troca vale nas outras abas e depois de entrar de novo", async ({
  page,
}) => {
  const email = await criarConta(page, "Marcelo Souza");
  await criarGrupoCom(await idDaConta(email), "Viagem de Dezembro");
  await page.reload();

  const topo = page.getByRole("banner");
  const seletor = topo.getByLabel("Grupo");
  await expect(seletor.locator("option")).toHaveText(["Grupo de Marcelo", "Viagem de Dezembro"]);
  await expect(seletor).toHaveValue(/\d+/);
  await expect(topo).toContainText("Marcelo Souza");
  await expect(topo.getByRole("button", { name: "Sair" })).toBeVisible();

  await seletor.selectOption({ label: "Viagem de Dezembro" });
  await expect(seletor.locator("option:checked")).toHaveText("Viagem de Dezembro");
  await expect(seletor).toBeEnabled();

  await page.getByRole("navigation", { name: "Seções" }).getByRole("link", { name: "Lançamentos" }).click();
  await expect(page).toHaveURL(/\/lancamentos$/);
  await expect(topo.getByLabel("Grupo").locator("option:checked")).toHaveText("Viagem de Dezembro");

  // Scenario "Lembrar o grupo".
  await topo.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Entrar" }).last().click();
  await expect(page).toHaveURL(/\/resumo$/);
  await expect(page.getByRole("banner").getByLabel("Grupo").locator("option:checked")).toHaveText("Viagem de Dezembro");
});

test("removido do grupo ativo, a pessoa cai no outro grupo com um aviso", async ({ page }) => {
  const email = await criarConta(page, "Pedro Alves");
  const usuarioId = await idDaConta(email);
  const viagemId = await criarGrupoCom(usuarioId, "Viagem de Dezembro");
  await banco.usuario.update({ where: { id: usuarioId }, data: { grupoAtivoId: viagemId } });

  await banco.participacao.delete({ where: { usuarioId_grupoId: { usuarioId, grupoId: viagemId } } });
  await page.goto("/lancamentos");

  await expect(page.getByRole("status")).toHaveText('Você não participa mais de "Viagem de Dezembro".');
  await expect(page.getByRole("banner").getByLabel("Grupo").locator("option:checked")).toHaveText("Grupo de Pedro");
});

test("sem grupo, o topo não mostra o seletor, mas mostra a pessoa e Sair", async ({ page }) => {
  const email = await criarConta(page, "Joana Reis");
  await banco.participacao.deleteMany({ where: { usuarioId: await idDaConta(email) } });
  await page.reload();

  const topo = page.getByRole("banner");
  await expect(topo.getByLabel("Grupo")).toHaveCount(0);
  await expect(topo).toContainText("Joana Reis");
  await expect(topo.getByRole("button", { name: "Sair" })).toBeVisible();
});
