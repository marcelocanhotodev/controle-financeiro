import { test, expect, type Browser, type Page } from "@playwright/test";
import { esperarLink } from "./caixa-de-entrada";

// Tarefa 3.1 da change resumo-mensal — o fluxo completo do MVP, de ponta a
// ponta e só pela interface: cadastrar, criar grupo, convidar e aceitar,
// lançar entrada e saída, filtrar, excluir e desfazer, ver o resumo, trocar
// de grupo e sair do grupo.

test.use({ storageState: { cookies: [], origins: [] } });

function emailNovo(prefixo: string) {
  return `e2e-fluxo-${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`;
}

async function novaPagina(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

const aviso = (page: Page) => page.getByRole("status");
const formulario = (page: Page) => page.getByRole("region", { name: "Novo lançamento" });
const lista = (page: Page) => page.getByRole("region", { name: /de \d{4}$/ });
const resumoDoMes = (page: Page) => page.getByRole("region", { name: "Resumo do mês" });
const abas = (page: Page) => page.getByRole("navigation", { name: "Seções" });

test("fluxo completo do MVP", async ({ browser }) => {
  test.slow();
  const nomeDoGrupo = `Casa ${Math.random().toString(36).slice(2, 6)}`;

  // Cadastrar.
  const ana = await novaPagina(browser);
  await ana.goto("/criar-conta");
  await ana.getByLabel("Nome").fill("Ana Lima");
  await ana.getByLabel("E-mail").fill(emailNovo("ana"));
  await ana.getByLabel("Senha").fill("senha-da-ana-123");
  await ana.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(ana).toHaveURL(/\/resumo$/);
  await expect(ana.getByRole("heading", { level: 1 })).toHaveText("Grupo de Ana");

  // Criar grupo.
  await abas(ana).getByRole("link", { name: "Grupo" }).click();
  await ana.getByLabel("Nome do grupo").fill(nomeDoGrupo);
  await ana.getByRole("button", { name: "Criar grupo" }).click();
  await expect(aviso(ana)).toHaveText(`Grupo "${nomeDoGrupo}" criado.`);
  await expect(ana.getByRole("heading", { level: 1 })).toHaveText(nomeDoGrupo);

  // Convidar e aceitar (quem é convidado ainda não tem conta).
  const emailMarcelo = emailNovo("marcelo");
  await ana.getByLabel("Convidar por e-mail").fill(emailMarcelo);
  await ana.getByRole("button", { name: "Convidar" }).click();
  await expect(aviso(ana)).toHaveText(`Convite enviado para ${emailMarcelo}.`);

  const marcelo = await novaPagina(browser);
  await marcelo.goto(await esperarLink(emailMarcelo, /\/definir-senha\/[0-9a-f]{64}/));
  await marcelo.getByLabel("Nome").fill("Marcelo Souza");
  await marcelo.getByLabel("Senha").fill("senha-do-marcelo");
  await marcelo.getByRole("button", { name: "Criar conta e entrar no grupo" }).click();
  await expect(marcelo).toHaveURL(/\/resumo$/);
  await expect(marcelo.getByRole("heading", { level: 1 })).toHaveText(nomeDoGrupo);

  // Lançar entrada (Ana) e saída (Marcelo).
  await abas(ana).getByRole("link", { name: "Lançamentos" }).click();
  await formulario(ana).getByRole("radio", { name: "Entrada" }).check();
  await formulario(ana).getByLabel("Descrição").fill("Salário");
  await formulario(ana).getByLabel("Valor (R$)").fill("5.000,00");
  await formulario(ana).getByRole("button", { name: "Registrar entrada" }).click();
  await expect(aviso(ana)).toHaveText("Entrada de R$ 5.000,00 registrada.");

  await abas(marcelo).getByRole("link", { name: "Lançamentos" }).click();
  await formulario(marcelo).getByLabel("Descrição").fill("Mercado da semana");
  await formulario(marcelo).getByLabel("Valor (R$)").fill("300");
  await formulario(marcelo).getByLabel("Categoria").selectOption("Mercado");
  await formulario(marcelo).getByRole("button", { name: "Registrar saída" }).click();
  await expect(aviso(marcelo)).toHaveText("Saída de R$ 300,00 registrada.");

  // Filtrar.
  await ana.reload();
  await expect(lista(ana)).toContainText("2 lançamentos");
  await lista(ana).getByLabel("Tipo").selectOption("SAIDA");
  await expect(lista(ana)).toContainText("1 lançamento");
  await expect(lista(ana)).toContainText("Mercado · Marcelo Souza");
  await lista(ana).getByLabel("Tipo").selectOption("");

  // Excluir e desfazer (Ana é administradora e pode excluir o de Marcelo).
  await ana.getByRole("button", { name: "Excluir Mercado da semana" }).click();
  await expect(aviso(ana)).toContainText("Lançamento excluído.");
  await expect(lista(ana)).toContainText("1 lançamento");
  await aviso(ana).getByRole("button", { name: "Desfazer" }).click();
  await expect(lista(ana)).toContainText("2 lançamentos");

  // Ver o resumo.
  await abas(ana).getByRole("link", { name: "Resumo" }).click();
  await expect(resumoDoMes(ana).getByTestId("saldo")).toHaveText("R$ 4.700,00");
  await expect(resumoDoMes(ana).getByTestId("entradas")).toHaveText("+ R$ 5.000,00");
  await expect(resumoDoMes(ana).getByTestId("saidas")).toHaveText("− R$ 300,00");
  const pessoas = ana.getByRole("region", { name: "Quem registrou" }).locator("tbody tr");
  await expect(pessoas.locator("th")).toHaveText(["Ana Lima", "Marcelo Souza"]);
  await expect(pessoas.nth(1).locator("td")).toHaveText(["R$ 0,00", "R$ 300,00"]);

  // Trocar de grupo.
  await ana.getByRole("banner").getByLabel("Grupo").selectOption({ label: "Grupo de Ana" });
  await expect(ana.getByRole("heading", { level: 1 })).toHaveText("Grupo de Ana");
  await expect(resumoDoMes(ana).getByTestId("saldo")).toHaveText("R$ 0,00");
  await expect(ana.getByRole("link", { name: "Registre o primeiro lançamento" })).toBeVisible();

  // Sair do grupo (Marcelo, que só participa deste).
  await abas(marcelo).getByRole("link", { name: "Grupo" }).click();
  await marcelo.getByRole("button", { name: "Sair deste grupo" }).click();
  await marcelo.getByRole("button", { name: "Confirmar saída do grupo" }).click();
  await expect(aviso(marcelo)).toHaveText("Você saiu do grupo.");
  await expect(marcelo.getByText("Você ainda não participa de nenhum grupo. Crie um ou entre com um código.")).toBeVisible();

  // O lançamento de Marcelo continua no resumo do grupo, como ex-membro.
  await ana.getByRole("banner").getByLabel("Grupo").selectOption({ label: nomeDoGrupo });
  await expect(ana.getByRole("heading", { level: 1 })).toHaveText(nomeDoGrupo);
  await expect(pessoas.locator("th")).toHaveText(["Ana Lima", "Marcelo Souza (ex-membro)"]);
  await expect(resumoDoMes(ana).getByTestId("saldo")).toHaveText("R$ 4.700,00");
});
