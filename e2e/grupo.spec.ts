import { test, expect, type Browser, type Page } from "@playwright/test";
import { esperarLink } from "./caixa-de-entrada";

// Capability grupos — aba Grupo. Tarefas 3.8 (convite para quem não tem
// conta), 3.9 (Administradora e Membro), 3.10 (remoção e saída com
// confirmação) e 3.11 (pessoa sem grupo).

test.use({ storageState: { cookies: [], origins: [] } });

const SENHA = "senha-forte-123";

function emailNovo(prefixo: string) {
  return `e2e-${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`;
}

async function novaPagina(browser: Browser): Promise<Page> {
  const contexto = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  return contexto.newPage();
}

async function criarConta(page: Page, nome: string, email: string, codigoGrupo = "") {
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(SENHA);
  if (codigoGrupo) await page.getByLabel("Código do grupo (opcional)").fill(codigoGrupo);
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page).toHaveURL(/\/resumo$/);
}

async function abrirAbaGrupo(page: Page) {
  await page.goto("/grupo");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function codigoDoGrupo(page: Page): Promise<string> {
  await abrirAbaGrupo(page);
  return page.getByLabel("Código deste grupo").inputValue();
}

const membros = (page: Page) => page.getByRole("region", { name: /^Membros/ });
const aviso = (page: Page) => page.getByRole("status");

test("Administradora vê código, convite e pendentes; Membro vê só a lista", async ({ browser }) => {
  const marcelo = await novaPagina(browser);
  await criarConta(marcelo, "Marcelo Souza", emailNovo("adm"));
  const codigo = await codigoDoGrupo(marcelo);

  await expect(marcelo.getByRole("heading", { level: 1 })).toHaveText("Grupo de Marcelo");
  await expect(membros(marcelo).getByRole("heading")).toHaveText("Membros (1)");
  await expect(membros(marcelo)).toContainText("Marcelo Souza (você)");
  await expect(membros(marcelo)).toContainText("Administrador");
  await expect(codigo).toMatch(/^GRUPOD-\d{4}$/);

  await marcelo.getByRole("button", { name: "Copiar" }).click();
  await expect(aviso(marcelo)).toHaveText("Código copiado.");

  const ana = await novaPagina(browser);
  await criarConta(ana, "Ana Lima", emailNovo("membro"), codigo.toLowerCase());

  const convidada = emailNovo("pendente");
  await marcelo.getByLabel("Convidar por e-mail").fill(convidada);
  await marcelo.getByRole("button", { name: "Convidar" }).click();
  await expect(aviso(marcelo)).toHaveText(`Convite enviado para ${convidada}.`);
  await expect(membros(marcelo).getByRole("heading")).toHaveText("Membros (2)");
  await expect(membros(marcelo)).toContainText(convidada);
  await expect(membros(marcelo)).toContainText("Convite pendente");
  await expect(membros(marcelo).getByRole("button", { name: `Reenviar convite para ${convidada}` })).toBeVisible();

  await abrirAbaGrupo(ana);
  await expect(membros(ana).getByRole("heading")).toHaveText("Membros (2)");
  await expect(membros(ana)).toContainText("Ana Lima (você)");
  await expect(membros(ana)).not.toContainText(convidada);
  await expect(ana.getByLabel("Código deste grupo")).toHaveCount(0);
  await expect(ana.getByLabel("Convidar por e-mail")).toHaveCount(0);
  await expect(membros(ana).getByRole("button", { name: /^Remover/ })).toHaveCount(0);
});

test("convite para quem não tem conta: a pessoa cria a conta pelo link e entra no grupo", async ({ browser }) => {
  const marcelo = await novaPagina(browser);
  await criarConta(marcelo, "Marcelo Souza", emailNovo("adm"));
  await abrirAbaGrupo(marcelo);

  const emailJoana = emailNovo("joana");
  await marcelo.getByLabel("Convidar por e-mail").fill(emailJoana);
  await marcelo.getByRole("button", { name: "Convidar" }).click();
  await expect(aviso(marcelo)).toHaveText(`Convite enviado para ${emailJoana}.`);

  const joana = await novaPagina(browser);
  await joana.goto(await esperarLink(emailJoana, /\/definir-senha\/[0-9a-f]{64}/));
  await expect(joana.getByRole("heading", { name: "Convite para “Grupo de Marcelo”" })).toBeVisible();
  await expect(joana.getByLabel("E-mail")).toHaveValue(emailJoana);
  await expect(joana.getByLabel("E-mail")).not.toBeEditable();
  await joana.getByLabel("Nome").fill("Joana Reis");
  await joana.getByLabel("Senha").fill("senha-da-joana");
  await joana.getByRole("button", { name: "Criar conta e entrar no grupo" }).click();

  await expect(joana).toHaveURL(/\/resumo$/);
  await expect(joana.getByRole("banner").getByLabel("Grupo").locator("option")).toHaveText(["Grupo de Marcelo"]);

  await abrirAbaGrupo(marcelo);
  await expect(membros(marcelo).getByRole("heading")).toHaveText("Membros (2)");
  await expect(membros(marcelo)).toContainText("Joana Reis");
  await expect(membros(marcelo)).not.toContainText("Convite pendente");
});

test("remover pede confirmação, que se desfaz ao tocar fora; o removido perde o acesso e fica sem grupo", async ({
  browser,
}) => {
  const marcelo = await novaPagina(browser);
  await criarConta(marcelo, "Marcelo Souza", emailNovo("adm"));
  const codigo = await codigoDoGrupo(marcelo);

  const pedro = await novaPagina(browser);
  await criarConta(pedro, "Pedro Alves", emailNovo("pedro"), codigo);

  await abrirAbaGrupo(marcelo);
  const remover = membros(marcelo).getByRole("button", { name: "Remover: Pedro Alves" });
  await remover.click();
  await expect(membros(marcelo).getByRole("button", { name: "Confirmar: Pedro Alves" })).toBeVisible();

  // Scenario "Cancelar a confirmação".
  await marcelo.getByRole("heading", { level: 1 }).click();
  await expect(remover).toBeVisible();
  await expect(membros(marcelo).getByRole("heading")).toHaveText("Membros (2)");

  await remover.click();
  await membros(marcelo).getByRole("button", { name: "Confirmar: Pedro Alves" }).click();
  await expect(aviso(marcelo)).toHaveText("Pedro Alves saiu do grupo.");
  await expect(membros(marcelo).getByRole("heading")).toHaveText("Membros (1)");

  // Scenario "Removido com o app aberto" + "Pessoa sem grupo".
  await pedro.goto("/lancamentos");
  await expect(pedro).toHaveURL(/\/grupo$/);
  await expect(pedro.getByText("Você ainda não participa de nenhum grupo. Crie um ou entre com um código.")).toBeVisible();
  await expect(pedro.getByRole("banner").getByLabel("Grupo")).toHaveCount(0);

  // Sem grupo, pode criar um.
  await pedro.getByLabel("Nome do grupo").fill("Reforma da cozinha");
  await pedro.getByRole("button", { name: "Criar grupo" }).click();
  await expect(aviso(pedro)).toHaveText('Grupo "Reforma da cozinha" criado.');
  await expect(pedro.getByRole("heading", { level: 1 })).toHaveText("Reforma da cozinha");
});

test("sair do único grupo, com confirmação, deixa a pessoa sem grupo e sem dados nas outras abas", async ({ browser }) => {
  const ana = await novaPagina(browser);
  await criarConta(ana, "Ana Lima", emailNovo("sair"));
  await abrirAbaGrupo(ana);

  await ana.getByRole("button", { name: "Sair deste grupo" }).click();
  await ana.getByRole("button", { name: "Confirmar saída do grupo" }).click();
  await expect(aviso(ana)).toHaveText("Você saiu do grupo.");
  await expect(ana.getByText("Você ainda não participa de nenhum grupo. Crie um ou entre com um código.")).toBeVisible();

  for (const aba of ["/resumo", "/lancamentos"]) {
    await ana.goto(aba);
    await expect(ana).toHaveURL(/\/grupo$/);
  }

  // Entrar com código inexistente mostra o erro no campo.
  await ana.getByLabel("Código do grupo").fill("NAOEXISTE-0000");
  await ana.getByRole("button", { name: "Entrar no grupo" }).click();
  await expect(ana.locator("form").getByRole("alert")).toHaveText("Não encontramos nenhum grupo com este código.");
});
