# Proposal: Lançamentos

## Why
Terceira das quatro partes do Caixa Comum (ver `openspec/project.md`). Com contas e grupos prontos em `usuarios-e-grupos`, falta o motivo de existir do app: registrar o dinheiro que entra e sai. Ao fim desta parte, o grupo já usa o Caixa Comum no dia a dia, mesmo antes do resumo mensal.

## What Changes
- Registro de entradas e saídas no grupo ativo, com descrição, valor, categoria fixa por tipo e data
- Lista do mês com seletor de mês, filtros por tipo e pessoa e rodapé com quantidade e totais do que está filtrado
- Exclusão pelo autor ou por um Administrador, com "Desfazer" por 6 segundos e limpeza definitiva automática depois de 24 horas
- "Ex-membro" como autor dos lançamentos de quem saiu do grupo
- Lançamentos de exemplo (6 meses) no ambiente de desenvolvimento

Ajustes em relação ao protótipo (`openspec/prototype/Caixa Comum.html`):
- Valores guardados e somados de forma exata, sem erro de arredondamento
- A restauração pelo servidor só é aceita até 1 minuto depois da exclusão

Fora do escopo: edição de lançamento, lançamentos recorrentes, anexos e importação de extrato.

## Capabilities

### New Capabilities
- `lancamentos`: registro, categorias, valores em reais, lista do mês, seletor de mês, filtros, totais, exclusão, desfazer, autoria e isolamento entre grupos

### Modified Capabilities
Nenhuma. A regra de que um grupo excluído leva junto os seus lançamentos entra como requisito novo de `lancamentos`.

## Impact
- Depende de `usuarios-e-grupos` arquivada, principalmente de `getGrupoAtual()` e `exigirAdmin()`
- Tabela nova: `lancamentos`
- Variável nova: `CRON_SECRET`
- Agendamento novo no Vercel Cron (`vercel.json`)
