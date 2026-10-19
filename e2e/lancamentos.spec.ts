import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { banco, criarGrupoCom, idDaConta } from "./banco";

// Capability lancamentos — aba Lançamentos. Tarefas 2.3 (formulário), 3.3
// (troca de grupo limpa os filtros), 3.4 (linhas, filtros, rodapé e
// ex-membros), 4.1 (excluir e desfazer) e 4.3 (nome acessível do excluir).
//
// Cada teste cria a própria conta: os projetos celular e desktop rodam em
// paralelo e não podem escrever no mesmo grupo.

test.use({ storageState: { cookies: [], origins: [] } });

test.afterAll(async () => {
  await banco.$disconnect();
});

async function criarConta(page: Page, nome: string): Promise<{ email: string; usuarioId: number; grupoId: number }> {
  const email = `e2e-lanc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@caixa.test`;
  await page.goto("/criar-conta");
  await page.getByLabel("Nome").fill(nome);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-forte-123");
  await page.getByRole("button", { name: "Criar conta" }).last().click();
  await expect(page).toHaveURL(/\/resumo$/);
  const usuarioId = await idDaConta(email);
  const { grupoAtivoId } = await banco.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  return { email, usuarioId, grupoId: grupoAtivoId! };
}

/** Lançamento direto no banco, para montar situações (ex.: de outra pessoa). */
async function lancar(grupoId: number, autorId: number, dados: { tipo: "ENTRADA" | "SAIDA"; descricao: string; valor: string; data: string }) {
  await banco.lancamento.create({
    data: {
      grupoId,
      autorId,
      tipo: dados.tipo,
      descricao: dados.descricao,
      valor: dados.valor,
      categoria: dados.tipo === "ENTRADA" ? "Salário" : "Contas",
      data: new Date(`${dados.data}T00:00:00Z`),
    },
  });
}

function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const lista = (page: Page) => page.getByRole("region", { name: /de \d{4}$/ });
const formulario = (page: Page) => page.getByRole("region", { name: "Novo lançamento" });
const aviso = (page: Page) => page.getByRole("status");

test("registrar uma saída e uma entrada pelo formulário", async ({ page }) => {
  await criarConta(page, "Ana Lima");
  await page.goto("/lancamentos");

  const form = formulario(page);
  await expect(form.getByLabel("Data")).toHaveValue(hojeEmSaoPaulo());
  await expect(form.getByRole("button", { name: "Registrar saída" })).toBeVisible();

  // Erro mantém o que foi digitado e leva o foco ao campo.
  await form.getByLabel("Valor (R$)").fill("412,80");
  await form.getByRole("button", { name: "Registrar saída" }).click();
  await expect(form.getByRole("alert")).toHaveText("Descreva o lançamento.");
  await expect(form.getByLabel("Descrição")).toBeFocused();
  await expect(form.getByLabel("Valor (R$)")).toHaveValue("412,80");

  await form.getByLabel("Descrição").fill("Mercado da semana");
  await form.getByLabel("Categoria").selectOption("Mercado");
  await form.getByRole("button", { name: "Registrar saída" }).click();
  await expect(aviso(page)).toHaveText("Saída de R$ 412,80 registrada.");
  await expect(lista(page).getByRole("listitem").first()).toContainText("Mercado da semana");
  await expect(lista(page).getByRole("listitem").first()).toContainText("Mercado · Ana Lima");
  await expect(lista(page).getByRole("listitem").first()).toContainText("− R$ 412,80");

  // Trocar o tipo mantém descrição e valor e troca categorias e botão.
  await form.getByLabel("Descrição").fill("Salário de outubro");
  await form.getByLabel("Valor (R$)").fill("1.250,50");
  await form.getByRole("radio", { name: "Entrada" }).check();
  await expect(form.getByLabel("Descrição")).toHaveValue("Salário de outubro");
  await expect(form.getByLabel("Valor (R$)")).toHaveValue("1.250,50");
  await expect(form.getByLabel("Categoria").locator("option")).toHaveText(["Salário", "Extra", "Aporte", "Outros"]);
  await form.getByRole("button", { name: "Registrar entrada" }).click();
  await expect(aviso(page)).toHaveText("Entrada de R$ 1.250,50 registrada.");
  await expect(lista(page)).toContainText("+ R$ 1.250,50");
});

test("depois de salvar, a lista vai para o mês do lançamento, sem filtros", async ({ page }) => {
  await criarConta(page, "Marcelo Souza");
  await page.goto("/lancamentos?tipo=ENTRADA");

  const form = formulario(page);
  await form.getByLabel("Descrição").fill("Conta antiga");
  await form.getByLabel("Valor (R$)").fill("80");
  await form.getByLabel("Data").fill("2025-03-15");
  await form.getByRole("button", { name: "Registrar saída" }).click();

  await expect(page).toHaveURL(/\/lancamentos\?mes=2025-03$/);
  await expect(lista(page).getByRole("heading")).toHaveText("Março de 2025");
  await expect(lista(page).getByLabel("Tipo")).toHaveValue("");
  await expect(lista(page)).toContainText("Conta antiga");
});

test("filtrar por Saídas atualiza a lista e o rodapé; sem resultado mostra a mensagem", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Ana Lima");
  const mes = hojeEmSaoPaulo().slice(0, 7);
  await lancar(grupoId, usuarioId, { tipo: "ENTRADA", descricao: "Salário", valor: "5400", data: `${mes}-05` });
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", descricao: "Aluguel", valor: "1850", data: `${mes}-08` });
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", descricao: "Luz", valor: "189.90", data: `${mes}-09` });
  await page.goto("/lancamentos");

  await expect(lista(page)).toContainText("3 lançamentos");
  await expect(lista(page)).toContainText("Entradas R$ 5.400,00 · Saídas R$ 2.039,90");

  await lista(page).getByLabel("Tipo").selectOption("SAIDA");
  await expect(page).toHaveURL(/tipo=SAIDA/);
  await expect(lista(page)).toContainText("2 lançamentos");
  await expect(lista(page)).toContainText("Entradas R$ 0,00 · Saídas R$ 2.039,90");
  await expect(lista(page)).not.toContainText("Salário");

  await lista(page).getByLabel("Tipo").selectOption("ENTRADA");
  await expect(lista(page)).toContainText("1 lançamento");

  await page.goto(`/lancamentos?mes=${mes}&tipo=ENTRADA&autor=999999999`);
  await expect(lista(page).getByLabel("Pessoa")).toHaveValue("");
  await expect(lista(page)).toContainText("1 lançamento");

  await page.goto("/lancamentos?mes=2020-01");
  await expect(lista(page)).toContainText("Nenhum lançamento com esses filtros.");
});

test("excluir com nome acessível e desfazer a tempo", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Ana Lima");
  const mes = hojeEmSaoPaulo().slice(0, 7);
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", descricao: "Mercado", valor: "300", data: `${mes}-10` });
  await page.goto("/lancamentos");

  await page.getByRole("button", { name: "Excluir Mercado" }).click();
  await expect(aviso(page)).toContainText("Lançamento excluído.");
  await expect(lista(page)).toContainText("Nenhum lançamento com esses filtros.");

  await aviso(page).getByRole("button", { name: "Desfazer" }).click();
  await expect(lista(page)).toContainText("Mercado");
  await expect(lista(page)).toContainText("Saídas R$ 300,00");
});

test("ex-membro: linha atenuada com o nome e (ex-membro), no mesmo filtro, sem violações de acessibilidade", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Marcelo Souza");
  const mes = hojeEmSaoPaulo().slice(0, 7);
  const pedro = await banco.usuario.create({
    data: { nome: "Pedro Alves", email: `e2e-lanc-pedro-${Date.now()}@caixa.test`, senhaHash: "x" },
  });
  await lancar(grupoId, pedro.id, { tipo: "SAIDA", descricao: "Gasolina", valor: "220", data: `${mes}-02` });
  await lancar(grupoId, usuarioId, { tipo: "SAIDA", descricao: "Mercado", valor: "100", data: `${mes}-03` });
  await page.goto("/lancamentos");

  const linhaPedro = lista(page).getByRole("listitem").filter({ hasText: "Gasolina" });
  await expect(linhaPedro).toContainText("Contas · Pedro Alves (ex-membro)");
  await expect(linhaPedro).toHaveClass(/opacity-70/);
  // Administrador continua podendo excluir o lançamento do ex-membro.
  await expect(linhaPedro.getByRole("button", { name: "Excluir Gasolina" })).toBeVisible();

  await expect(lista(page).getByLabel("Pessoa").locator("option")).toHaveText(["Todas", "Marcelo Souza", "Pedro Alves (ex-membro)"]);
  await lista(page).getByLabel("Pessoa").selectOption({ label: "Pedro Alves (ex-membro)" });
  await expect(lista(page)).toContainText("1 lançamento");
  await expect(lista(page)).not.toContainText("Mercado");

  // Exceção aceita no design: só a regra de contraste fica de fora, e só nas
  // linhas de ex-membro (opacidade de 70%).
  const regras = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  for (const tema of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: tema });
    const resto = await new AxeBuilder({ page }).withTags(regras).exclude("[data-ex-membro]").analyze();
    expect(resto.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    const linhasExMembro = await new AxeBuilder({ page })
      .withTags(regras)
      .include("[data-ex-membro]")
      .disableRules(["color-contrast"])
      .analyze();
    expect(linhasExMembro.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  }
});

test("trocar de grupo com filtro ativo leva à aba sem filtros", async ({ page }) => {
  const { usuarioId, grupoId } = await criarConta(page, "Ana Lima");
  const viagemId = await criarGrupoCom(usuarioId, "Viagem de Dezembro");
  const mes = hojeEmSaoPaulo().slice(0, 7);
  await lancar(viagemId, usuarioId, { tipo: "ENTRADA", descricao: "Aporte da viagem", valor: "500", data: `${mes}-01` });
  await page.goto(`/lancamentos?tipo=SAIDA&autor=${usuarioId}`);
  void grupoId;

  await page.getByRole("banner").getByLabel("Grupo").selectOption({ label: "Viagem de Dezembro" });
  await expect(page).toHaveURL(/\/lancamentos$/);
  await expect(lista(page).getByLabel("Tipo")).toHaveValue("");
  await expect(lista(page).getByLabel("Pessoa")).toHaveValue("");
  await expect(lista(page)).toContainText("Aporte da viagem");
});

test("removida do grupo filtrado, a pessoa vê os lançamentos do novo grupo", async ({ page }) => {
  const { usuarioId, grupoId: casaId } = await criarConta(page, "Ana Lima");
  const viagemId = await criarGrupoCom(usuarioId, "Viagem de Dezembro");
  const mes = hojeEmSaoPaulo().slice(0, 7);
  const bruno = await banco.usuario.create({
    data: { nome: "Bruno", email: `e2e-lanc-bruno-${Date.now()}@caixa.test`, senhaHash: "x" },
  });
  await banco.participacao.create({ data: { usuarioId: bruno.id, grupoId: viagemId, papel: "MEMBRO" } });
  await lancar(casaId, usuarioId, { tipo: "SAIDA", descricao: "Aluguel da casa", valor: "1850", data: `${mes}-05` });
  await banco.usuario.update({ where: { id: usuarioId }, data: { grupoAtivoId: viagemId } });
  await page.goto(`/lancamentos?autor=${bruno.id}`);
  await expect(lista(page).getByLabel("Pessoa")).toHaveValue(String(bruno.id));

  await banco.participacao.delete({ where: { usuarioId_grupoId: { usuarioId, grupoId: viagemId } } });
  await page.reload();

  await expect(aviso(page)).toHaveText('Você não participa mais de "Viagem de Dezembro".');
  await expect(lista(page).getByLabel("Pessoa")).toHaveValue("");
  await expect(lista(page)).toContainText("Aluguel da casa");
});
