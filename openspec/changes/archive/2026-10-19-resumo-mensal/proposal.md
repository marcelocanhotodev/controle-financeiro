# Proposal: Resumo mensal

## Why
Última das quatro partes do Caixa Comum (ver `openspec/project.md`). Com os lançamentos registrados em `lancamentos`, o grupo ainda não tem uma visão rápida de como está o mês: saldo, para onde foi o dinheiro e quem lançou o quê. O Resumo é a aba inicial do protótipo e fecha o MVP.

## What Changes
- Saldo, entradas e saídas do mês, com saldo negativo em destaque e com sinal
- Comparação das saídas com o mês anterior
- Gráfico de barras de entradas e saídas dos seis meses que terminam no mês escolhido
- Saídas por categoria, com percentual e barra proporcional
- Totais de entradas e saídas por pessoa, incluindo quem não lançou nada
- Estado vazio para grupo sem lançamentos
- O mês escolhido passa a ser o mesmo nas abas Resumo e Lançamentos
- Teste de ponta a ponta do fluxo completo do MVP

O Resumo só lê dados. Nenhuma tabela nova.

## Capabilities

### New Capabilities
- `resumo`: totais do mês, comparação, gráfico de seis meses, categorias, totais por pessoa, estado vazio e mês compartilhado com Lançamentos

### Modified Capabilities
Nenhuma. O seletor de mês continua definido em `lancamentos`. O Resumo o reutiliza.

## Impact
- Depende de `lancamentos` arquivada
- Dependência nova: `recharts`, a mesma versão do matilha-app
