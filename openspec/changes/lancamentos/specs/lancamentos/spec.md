## Purpose
Registro, consulta e exclusão das entradas e saídas de dinheiro de um grupo.

## ADDED Requirements

### Requirement: Registro de lançamento
O sistema SHALL permitir que qualquer membro registre uma entrada ou uma saída no grupo ativo, informando tipo, descrição, valor, categoria e data.

#### Scenario: Registrar uma saída
- GIVEN Ana está no grupo ativo "Finanças da Casa"
- WHEN ela escolhe Saída, descreve "Mercado da semana", informa 412,80, categoria "Mercado" e data de hoje
- THEN o lançamento é salvo em nome de Ana
- AND aparece no topo da lista do mês
- AND o sistema mostra "Saída de R$ 412,80 registrada."

#### Scenario: Registrar uma entrada
- GIVEN o formulário de novo lançamento
- WHEN a pessoa escolhe Entrada e salva
- THEN o botão de envio diz "Registrar entrada"
- AND o aviso diz "Entrada de" seguido do valor e "registrada."

#### Scenario: Valor com vírgula ou ponto
- GIVEN o campo de valor
- WHEN a pessoa digita "1.250,50" ou "1250.50"
- THEN o sistema entende os dois como R$ 1.250,50

#### Scenario: Descrição vazia
- GIVEN o formulário de novo lançamento
- WHEN a pessoa envia sem descrição
- THEN o sistema mostra "Descreva o lançamento."
- AND mantém o que ela já digitou nos outros campos

#### Scenario: Valor inválido
- GIVEN o formulário de novo lançamento
- WHEN a pessoa envia valor vazio, zero, negativo ou que não seja número
- THEN o sistema mostra "Informe um valor maior que zero, como 125,90."

#### Scenario: Data vazia
- GIVEN o formulário de novo lançamento
- WHEN a pessoa apaga a data e envia
- THEN o sistema mostra "Escolha a data."

#### Scenario: Data padrão
- GIVEN a pessoa abre o formulário
- WHEN ele é exibido
- THEN o campo data vem preenchido com o dia de hoje no fuso America/Sao_Paulo

#### Scenario: Ver o lançamento recém-criado
- GIVEN a pessoa está vendo um mês diferente do mês da data que informou
- WHEN o lançamento é salvo
- THEN a lista muda para o mês do lançamento
- AND os filtros de tipo e pessoa voltam para "Todos"

### Requirement: Categorias
O sistema SHALL oferecer um conjunto fixo de categorias para cada tipo de lançamento.

#### Scenario: Categorias de saída
- GIVEN o tipo Saída selecionado
- WHEN a pessoa abre o campo Categoria
- THEN as opções são Moradia, Mercado, Contas, Transporte, Lazer, Saúde, Viagem e Outros

#### Scenario: Categorias de entrada
- GIVEN o tipo Entrada selecionado
- WHEN a pessoa abre o campo Categoria
- THEN as opções são Salário, Extra, Aporte e Outros

#### Scenario: Trocar o tipo
- GIVEN a pessoa já digitou descrição e valor
- WHEN ela alterna entre Saída e Entrada
- THEN a lista de categorias e o texto do botão mudam
- AND descrição e valor digitados são mantidos

### Requirement: Valores em reais
O sistema SHALL guardar e somar valores em reais de forma exata, com duas casas decimais e sem aritmética de ponto flutuante, e SHALL exibi-los no formato brasileiro.

#### Scenario: Sem erro de arredondamento
- GIVEN dez lançamentos de R$ 0,10
- WHEN o total é calculado
- THEN o resultado é exatamente R$ 1,00

#### Scenario: Formato de exibição
- GIVEN um lançamento de 1250,5 reais
- WHEN ele aparece na lista
- THEN o valor é exibido como "R$ 1.250,50"
- AND entradas levam o prefixo "+" e saídas o prefixo "−", além da cor

### Requirement: Lista de lançamentos do mês
O sistema SHALL listar os lançamentos do grupo ativo no mês escolhido, do mais recente para o mais antigo, mostrando data, descrição, categoria, autor e valor.

#### Scenario: Mês atual por padrão
- GIVEN a pessoa abre a aba Lançamentos
- WHEN a lista é exibida
- THEN mostra o mês atual
- AND o título da lista traz o nome do mês e do ano

#### Scenario: Ordem
- GIVEN lançamentos em dias diferentes e mais de um no mesmo dia
- WHEN a lista é exibida
- THEN os dias mais recentes vêm primeiro
- AND, no mesmo dia, o último registrado vem primeiro

#### Scenario: Cada linha
- GIVEN um lançamento de Ana, categoria Mercado, em 10/10
- WHEN a linha é exibida
- THEN mostra "10/10", a descrição, "Mercado · Ana" e o valor com sinal

#### Scenario: Autor que saiu do grupo
- GIVEN Pedro tem lançamentos no grupo e deixa de participar dele
- WHEN a lista é exibida
- THEN os lançamentos dele continuam existindo
- AND o autor aparece como "Ex-membro"

#### Scenario: Tela grande
- GIVEN uma tela de desktop
- WHEN a aba Lançamentos é exibida
- THEN o formulário e a lista ficam lado a lado

### Requirement: Seleção de mês
O sistema SHALL permitir escolher o mês exibido na aba Lançamentos, listando o mês atual e todos os meses em que o grupo tem lançamentos.

#### Scenario: Opções do seletor
- GIVEN um grupo com lançamentos em maio, junho e outubro
- WHEN a pessoa abre o seletor de mês
- THEN vê o mês atual e esses meses, do mais recente para o mais antigo
- AND cada opção tem o formato "Outubro de 2026"

### Requirement: Filtros da lista
O sistema SHALL permitir filtrar a lista por tipo e por pessoa sem recarregar a página.

#### Scenario: Filtrar por tipo
- GIVEN a lista do mês com entradas e saídas
- WHEN a pessoa escolhe "Saídas" no filtro Tipo
- THEN só as saídas aparecem

#### Scenario: Filtrar por pessoa
- GIVEN a lista do mês com lançamentos de várias pessoas
- WHEN a pessoa escolhe "Ana" no filtro Pessoa
- THEN só os lançamentos de Ana aparecem

#### Scenario: Nada encontrado
- GIVEN filtros que não casam com nenhum lançamento
- WHEN a lista é exibida
- THEN aparece "Nenhum lançamento com esses filtros."

#### Scenario: Trocar de grupo zera os filtros
- GIVEN a pessoa filtrou "Saídas" de "Ana" em "Finanças da Casa"
- WHEN ela troca para "Viagem de Dezembro" no seletor do topo
- THEN os filtros de tipo e pessoa voltam para "Todos"

### Requirement: Totais da lista
O sistema SHALL mostrar no rodapé da lista a quantidade de lançamentos e os totais de entradas e saídas do que está filtrado.

#### Scenario: Rodapé acompanha os filtros
- GIVEN 12 lançamentos no mês
- WHEN a pessoa filtra por "Saídas"
- THEN o rodapé mostra a quantidade e o total apenas das saídas exibidas
- AND usa "lançamento" quando houver exatamente um

### Requirement: Exclusão de lançamento
O sistema SHALL permitir que o autor exclua o próprio lançamento e que um Administrador exclua qualquer lançamento do grupo.

#### Scenario: Autor exclui o seu
- GIVEN Ana vê um lançamento registrado por ela
- WHEN ela toca em excluir
- THEN o lançamento sai da lista
- AND o sistema mostra "Lançamento excluído."

#### Scenario: Membro não exclui o de outro
- GIVEN Pedro, Membro comum, vê um lançamento de Ana
- WHEN a linha é exibida
- THEN não existe botão de excluir
- AND uma requisição direta ao servidor para excluir é recusada sem alterar nada

#### Scenario: Administrador exclui o de outro
- GIVEN Marcelo é Administrador e vê um lançamento de Ana
- WHEN ele toca em excluir
- THEN o lançamento sai da lista

### Requirement: Desfazer exclusão
O sistema SHALL oferecer a ação "Desfazer" por 6 segundos depois de uma exclusão.

#### Scenario: Desfazer a tempo
- GIVEN um lançamento acabou de ser excluído
- WHEN a pessoa toca em "Desfazer" em até 6 segundos
- THEN o lançamento volta à lista com os mesmos dados
- AND os totais do mês voltam ao valor anterior

#### Scenario: Prazo esgotado
- GIVEN passaram mais de 6 segundos
- WHEN a pessoa olha o aviso
- THEN o botão "Desfazer" não existe mais
- AND o lançamento fica excluído de forma definitiva depois de um período de retenção interno

#### Scenario: Restaurar depois do prazo por requisição direta
- GIVEN um lançamento foi excluído há mais de 1 minuto
- WHEN alguém pede ao servidor para restaurá-lo
- THEN a ação é recusada
- AND o lançamento continua fora da lista

### Requirement: Isolamento entre grupos
O sistema SHALL permitir leitura e escrita de lançamentos apenas a quem é membro do grupo dono deles.

#### Scenario: Acesso a grupo alheio
- GIVEN uma pessoa autenticada que não participa do grupo "Viagem de Dezembro"
- WHEN ela tenta listar, criar, excluir ou restaurar lançamentos desse grupo por requisição direta ao servidor
- THEN a ação é recusada
- AND nenhum dado do grupo é revelado nem alterado

#### Scenario: Percorrer ids de lançamento
- GIVEN a pessoa conhece o formato dos ids, que são inteiros sequenciais
- WHEN ela pede ao servidor para excluir ou restaurar os ids 1, 2, 3 e seguintes de lançamentos de outros grupos
- THEN todas as respostas são idênticas às de um lançamento que não existe
- AND nenhum desses lançamentos é alterado

#### Scenario: Acesso cortado ao sair do grupo
- GIVEN Ana deixou de participar do grupo, mas continua autenticada
- WHEN ela tenta ler ou registrar lançamentos desse grupo
- THEN a ação é recusada, mesmo sem ter saído e entrado de novo

### Requirement: Autoria dos lançamentos
O sistema SHALL registrar sempre a pessoa autenticada como autora e SHALL ignorar qualquer autor enviado pelo cliente.

#### Scenario: Autor forçado no servidor
- GIVEN Ana autenticada
- WHEN a requisição de criação traz outro usuário como autor
- THEN o lançamento é salvo em nome de Ana

#### Scenario: Id e grupo escolhidos pelo cliente
- GIVEN Ana autenticada com o grupo "Finanças da Casa" ativo
- WHEN a requisição de criação traz um campo `id` ou o id de outro grupo
- THEN o id é gerado pelo banco
- AND o lançamento é salvo no grupo ativo

### Requirement: Lançamentos do grupo excluído
O sistema SHALL apagar todos os lançamentos de um grupo quando o grupo for excluído.

#### Scenario: Último membro sai
- GIVEN a única integrante de um grupo com lançamentos sai dele
- WHEN o grupo é excluído
- THEN todos os lançamentos do grupo deixam de existir
