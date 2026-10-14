# estrutura-app Specification

## Purpose
Estrutura geral do aplicativo: navegação por abas, barra superior, layout responsivo, tema, avisos, acessibilidade e instalação como app.

## Requirements

### Requirement: Navegação por seções
O sistema SHALL organizar o app em três seções (Resumo, Lançamentos e Grupo) acessíveis por abas.

#### Scenario: Trocar de aba
- GIVEN o app aberto
- WHEN a pessoa toca em "Lançamentos"
- THEN a seção correspondente aparece
- AND a aba ativa fica marcada com `aria-current="page"`

#### Scenario: Aba inicial
- GIVEN a pessoa acabou de abrir o app
- WHEN a primeira tela aparece
- THEN a aba Resumo está ativa

### Requirement: Barra superior
O sistema SHALL mostrar uma barra no topo de todas as seções com o nome do app.

#### Scenario: Nome do app no topo
- GIVEN qualquer aba exibida
- WHEN a pessoa olha o topo da tela
- THEN vê o nome "Caixa Comum"

### Requirement: Layout responsivo
O sistema SHALL funcionar sem rolagem horizontal em telas a partir de 360 px de largura, mantendo margem lateral mínima de 16 px.

#### Scenario: Tela de celular
- GIVEN uma tela de 400 px de largura
- WHEN qualquer aba é exibida
- THEN o conteúdo se reorganiza em uma coluna
- AND tabelas e gráficos largos rolam dentro do próprio quadro, nunca a página inteira

#### Scenario: Tela de 360 px
- GIVEN uma tela de 360 px de largura
- WHEN qualquer aba é exibida
- THEN a página não tem rolagem horizontal
- AND o conteúdo mantém pelo menos 16 px de margem nas laterais

### Requirement: Tema claro e escuro
O sistema SHALL seguir o tema claro ou escuro do aparelho e SHALL manter contraste legível nos dois.

#### Scenario: Seguir o aparelho
- GIVEN o aparelho está no modo escuro
- WHEN o app abre
- THEN todas as telas usam a paleta escura
- AND as cores de entrada, saída e alerta continuam distinguíveis

### Requirement: Avisos de retorno
O sistema SHALL confirmar ações importantes com um aviso curto que some sozinho em 6 segundos.

#### Scenario: Aviso após ação
- GIVEN uma ação concluída que pede confirmação
- WHEN a ação termina
- THEN um aviso aparece na parte de baixo da tela
- AND é anunciado a leitores de tela por região `aria-live`
- AND some sozinho depois de 6 segundos

#### Scenario: Aviso com ação
- GIVEN uma ação que pode ser desfeita
- WHEN o aviso aparece
- THEN ele inclui o botão "Desfazer" enquanto estiver visível

### Requirement: Acessibilidade
O sistema SHALL ser operável por teclado, com foco visível e campos com rótulo.

#### Scenario: Teclado
- GIVEN uma pessoa usando só o teclado
- WHEN ela percorre uma tela
- THEN todos os botões, abas, campos e seletores recebem foco com contorno visível

#### Scenario: Rótulos
- GIVEN qualquer formulário
- WHEN ele é lido por um leitor de tela
- THEN cada campo tem rótulo associado
- AND ações que só têm ícone têm nome acessível que diz sobre o que agem

### Requirement: Instalação como app
O sistema SHALL poder ser instalado na tela inicial do celular como PWA, com ícone próprio e abertura em tela cheia.

#### Scenario: Instalar
- GIVEN a pessoa abre o site no navegador do celular
- WHEN ela escolhe "Adicionar à tela inicial"
- THEN o app é instalado com o nome "Caixa Comum" e o ícone do produto
- AND abre sem a barra do navegador

#### Scenario: Sem conexão
- GIVEN o aparelho está sem internet
- WHEN a pessoa abre o app instalado
- THEN a interface carrega
- AND uma mensagem informa que é preciso conexão para ver e registrar lançamentos
