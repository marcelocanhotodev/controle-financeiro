# grupos Specification

## Purpose
Grupos que compartilham um caixa: criação, membros, papéis, código de grupo e convites.

## Requirements

### Requirement: Criação de grupo
O sistema SHALL permitir que qualquer pessoa autenticada crie um grupo com um nome, tornando-se Administradora dele.

#### Scenario: Criar grupo
- GIVEN uma pessoa autenticada na aba Grupo
- WHEN ela envia o nome "Reforma da cozinha"
- THEN o grupo é criado e ela é Administradora
- AND o grupo passa a ser o grupo ativo
- AND o sistema mostra o aviso `Grupo "Reforma da cozinha" criado.`

#### Scenario: Nome em branco
- GIVEN o formulário de novo grupo
- WHEN a pessoa envia o nome vazio
- THEN o sistema mostra "Dê um nome ao grupo."

### Requirement: Código do grupo
O sistema SHALL gerar para cada grupo um código único, curto e fácil de ditar, e SHALL mostrá-lo apenas aos Administradores.

#### Scenario: Código gerado na criação
- GIVEN a criação do grupo "Viagem de Dezembro"
- WHEN o grupo é salvo
- THEN ele recebe um código único como "VIAGEM-4821"

#### Scenario: Administrador copia o código
- GIVEN uma Administradora na aba Grupo
- WHEN ela toca em "Copiar"
- THEN o código vai para a área de transferência
- AND o sistema mostra "Código copiado."

#### Scenario: Membro não vê o código
- GIVEN um Membro comum na aba Grupo
- WHEN a tela é exibida
- THEN o código do grupo e o formulário de convite não aparecem

### Requirement: Lista de grupos e grupo ativo
O sistema SHALL permitir que a pessoa participe de vários grupos e escolha qual está ativo, e SHALL lembrar a última escolha.

#### Scenario: Trocar de grupo
- GIVEN uma pessoa que participa de "Finanças da Casa" e "Viagem de Dezembro"
- WHEN ela escolhe "Viagem de Dezembro" no seletor do topo
- THEN todas as abas passam a mostrar os dados desse grupo, sem precisar sair e entrar de novo

#### Scenario: Lembrar o grupo
- GIVEN a pessoa escolheu "Viagem de Dezembro" e saiu do app
- WHEN ela entra de novo
- THEN o grupo ativo continua sendo "Viagem de Dezembro"

#### Scenario: Escolher grupo do qual não participa
- GIVEN uma pessoa que não participa do grupo de id 7
- WHEN ela faz uma requisição direta ao servidor para tornar esse grupo o ativo
- THEN o grupo ativo não muda

#### Scenario: Mesmo grupo ativo em todos os aparelhos
- GIVEN a pessoa está com o app aberto no celular e no notebook, com "Finanças da Casa" ativo
- WHEN ela escolhe "Viagem de Dezembro" no celular
- THEN a próxima página aberta no notebook mostra "Viagem de Dezembro"

#### Scenario: Grupo ativo deixa de valer e há outro grupo
- GIVEN Pedro participa de "Finanças da Casa" e "Viagem de Dezembro", com "Viagem de Dezembro" ativo
- WHEN ele é removido de "Viagem de Dezembro" e em seguida abre qualquer aba
- THEN o grupo ativo passa a ser o grupo em que ele entrou primeiro entre os que ainda participa
- AND o sistema mostra uma vez o aviso `Você não participa mais de "Viagem de Dezembro".`
- AND o seletor do topo mostra o novo grupo ativo

#### Scenario: Sair do grupo ativo
- GIVEN Ana participa de "Finanças da Casa" e "Viagem de Dezembro", com "Viagem de Dezembro" ativo
- WHEN ela sai de "Viagem de Dezembro"
- THEN o grupo ativo passa a ser o grupo em que ela entrou primeiro entre os que ainda participa
- AND o sistema mostra apenas "Você saiu do grupo."

### Requirement: Entrada em grupo por código
O sistema SHALL permitir que uma pessoa autenticada entre em um grupo existente informando o código.

#### Scenario: Código válido
- GIVEN o grupo "Viagem de Dezembro" com o código "VIAGEM-DEZ"
- WHEN uma pessoa que não participa dele informa "viagem-dez"
- THEN ela entra como Membro
- AND o grupo passa a ser o grupo ativo
- AND o sistema mostra `Você entrou em "Viagem de Dezembro".`

#### Scenario: Código inexistente
- GIVEN o formulário de entrada por código
- WHEN a pessoa informa um código que não existe
- THEN o sistema mostra "Não encontramos nenhum grupo com este código."

#### Scenario: Já é membro
- GIVEN uma pessoa que já participa do grupo
- WHEN ela informa o código desse mesmo grupo
- THEN o sistema mostra "Você já participa deste grupo."

### Requirement: Convite por e-mail
O sistema SHALL permitir que Administradores convidem pessoas por e-mail, enviando um link de convite pessoal válido por 7 dias, e SHALL dar a mesma resposta ao Administrador tenha o e-mail conta ou não.

#### Scenario: Convidar um e-mail
- GIVEN uma Administradora do grupo "Finanças da Casa"
- WHEN ela convida "pedro@exemplo.com", que não participa do grupo
- THEN fica registrado um convite pendente para esse e-mail
- AND o endereço recebe um e-mail com o nome do grupo, quem convidou, o link do convite e a data de validade
- AND o sistema mostra "Convite enviado para pedro@exemplo.com."
- AND Pedro só passa a participar do grupo quando aceitar o convite

#### Scenario: Administrador não define senha
- GIVEN o formulário de convite
- WHEN ele é exibido
- THEN pede apenas o e-mail da pessoa convidada
- AND nenhuma conta é criada no momento do convite

#### Scenario: Link conforme a pessoa tenha conta
- GIVEN "pedro@exemplo.com" tem conta e "joana@exemplo.com" não tem
- WHEN a Administradora convida os dois
- THEN o e-mail de Pedro traz o link do convite
- AND o e-mail de Joana traz um link de definir senha, válido pelo mesmo prazo do convite

#### Scenario: Mesma resposta com ou sem conta
- GIVEN um e-mail que já tem conta e outro que não tem, nenhum dos dois no grupo
- WHEN a Administradora convida cada um deles
- THEN a mensagem exibida é a mesma nos dois casos

#### Scenario: E-mail inválido
- GIVEN o formulário de convite
- WHEN a Administradora envia um e-mail sem formato válido
- THEN o sistema mostra "Informe um e-mail válido."

#### Scenario: Já é membro
- GIVEN uma pessoa que já participa do grupo
- WHEN a Administradora convida o e-mail dela
- THEN o sistema mostra "Esta pessoa já faz parte do grupo."

#### Scenario: Convite pendente repetido
- GIVEN já existe um convite pendente para o e-mail neste grupo
- WHEN a Administradora o convida de novo
- THEN nenhum convite novo é criado
- AND o convite existente é reenviado com nova validade de 7 dias
- AND o sistema mostra "Convite reenviado para" seguido do e-mail

#### Scenario: Falha no envio do e-mail
- GIVEN o servidor de e-mail recusa a mensagem
- WHEN a Administradora convida um e-mail
- THEN o convite continua registrado como pendente
- AND o sistema mostra que o e-mail não pôde ser enviado e que é possível reenviar pela lista de membros

### Requirement: Aceite de convite
O sistema SHALL permitir que a pessoa dona do e-mail convidado aceite o convite pelo link recebido (o link do convite, se ela tem conta, ou o link de definir senha, se não tem), e SHALL torná-la Membro do grupo só depois do aceite.

#### Scenario: Aceitar já autenticado com o mesmo e-mail
- GIVEN Pedro está autenticado como "pedro@exemplo.com" e tem um convite válido para "Finanças da Casa"
- WHEN ele abre o link do convite e toca em "Entrar no grupo"
- THEN ele passa a ser Membro de "Finanças da Casa"
- AND o grupo passa a ser o grupo ativo
- AND o convite deixa de estar pendente

#### Scenario: Aceitar com conta, sem estar autenticado
- GIVEN Pedro tem conta mas não está autenticado
- WHEN ele abre o link do convite
- THEN o sistema pede que ele entre com a conta
- AND depois de entrar volta ao convite para aceitá-lo

#### Scenario: Aceitar sem conta
- GIVEN "joana@exemplo.com" não tem conta e recebeu o link de definir senha do convite para "Finanças da Casa"
- WHEN ela abre o link
- THEN vê o e-mail do convite sem poder alterá-lo e um formulário com nome e senha
- AND ao enviar nome e senha com pelo menos 8 caracteres, a conta é criada com o e-mail do convite
- AND ela passa a ser Membro de "Finanças da Casa", com esse grupo ativo, já autenticada
- AND nenhum grupo "Grupo de Joana" é criado
- AND o link deixa de funcionar

#### Scenario: E-mail do convite não pode ser trocado
- GIVEN o link de definir senha de um convite para "joana@exemplo.com"
- WHEN alguém faz uma requisição direta ao servidor enviando outro e-mail junto do nome e da senha
- THEN o e-mail enviado é ignorado
- AND a conta, se criada, usa "joana@exemplo.com"

#### Scenario: Conta criada antes de usar o link
- GIVEN Joana recebeu o link de definir senha do convite e depois criou uma conta pela tela "Criar conta"
- WHEN ela abre o link de definir senha
- THEN o sistema mostra "Este e-mail já tem conta. Entre para aceitar o convite."
- AND depois de entrar ela vai para o convite e pode aceitá-lo

#### Scenario: Autenticado com outro e-mail
- GIVEN Ana está autenticada como "ana@exemplo.com"
- WHEN ela abre um convite enviado para "pedro@exemplo.com"
- THEN o sistema mostra que o convite é para outro e-mail
- AND oferece sair para entrar com a conta certa
- AND Ana não entra no grupo

#### Scenario: Convite expirado, aceito ou inexistente
- GIVEN um link de convite com mais de 7 dias, já aceito, cancelado ou com token que não existe
- WHEN alguém o abre
- THEN o sistema mostra "Este convite não é mais válido. Peça um novo convite a quem administra o grupo."
- AND ninguém entra no grupo

#### Scenario: Já participa do grupo
- GIVEN Pedro já é Membro do grupo do convite
- WHEN ele abre o link
- THEN o sistema mostra "Você já participa deste grupo."

### Requirement: Gestão de convites pendentes
O sistema SHALL permitir que Administradores reenviem e cancelem convites pendentes do grupo.

#### Scenario: Reenviar
- GIVEN um convite pendente na lista de membros
- WHEN a Administradora toca em "Reenviar"
- THEN o e-mail é enviado de novo e a validade volta a ser de 7 dias
- AND, se o e-mail continua sem conta, o novo e-mail traz um novo link de definir senha e o anterior deixa de funcionar

#### Scenario: Cancelar
- GIVEN um convite pendente na lista de membros
- WHEN a Administradora toca em "Cancelar convite"
- THEN o convite sai da lista
- AND o link enviado deixa de funcionar, seja o link do convite, seja o de definir senha

### Requirement: Lista de membros
O sistema SHALL mostrar a todos os membros a lista de participantes, com nome, e-mail e papel, e SHALL mostrar os convites pendentes apenas aos Administradores.

#### Scenario: Ver membros
- GIVEN o grupo "Finanças da Casa" com 3 membros e 1 convite pendente
- WHEN uma Administradora abre a aba Grupo
- THEN vê o título "Membros (3)"
- AND cada membro com nome, e-mail e o selo "Administrador" ou "Membro"
- AND a própria pessoa marcada como "(você)"
- AND o convite pendente com o selo "Convite pendente" e a indicação de envio com falha, quando houver

#### Scenario: Membro não vê convites
- GIVEN o mesmo grupo
- WHEN um Membro comum abre a aba Grupo
- THEN vê os 3 membros
- AND não vê o convite pendente

### Requirement: Papéis e permissões
O sistema SHALL reconhecer dois papéis em cada grupo, Administrador e Membro, e SHALL aplicar as permissões no servidor.

#### Scenario: Matriz de permissões
- GIVEN um grupo com uma Administradora e um Membro
- WHEN cada um tenta uma ação
- THEN ambos podem ver o grupo, a lista de membros e sair do grupo
- AND somente a Administradora pode convidar, gerenciar convites, ver o código e remover membros

#### Scenario: Membro tenta ação de Administrador
- GIVEN um Membro comum
- WHEN ele faz uma requisição direta ao servidor para remover outro membro
- THEN a ação é recusada
- AND nada é alterado

### Requirement: Remoção de membro
O sistema SHALL permitir que um Administrador remova outro membro, pedindo confirmação antes, e SHALL cortar o acesso da pessoa removida imediatamente.

#### Scenario: Remover com confirmação
- GIVEN uma Administradora vendo a lista de membros
- WHEN ela toca em "Remover" ao lado de Pedro
- THEN o botão muda para "Confirmar"
- AND só ao tocar em "Confirmar" o membro é removido
- AND o sistema mostra "Pedro saiu do grupo."

#### Scenario: Cancelar a confirmação
- GIVEN o botão "Confirmar" está ativo
- WHEN a Administradora toca em qualquer outro ponto da interface
- THEN o botão volta para "Remover" e ninguém é removido

#### Scenario: Não remover a si mesma
- GIVEN uma Administradora na lista de membros
- WHEN a linha dela é exibida
- THEN não existe botão "Remover" para ela

#### Scenario: Removido com o app aberto
- GIVEN Pedro está com o grupo aberto em outro aparelho
- WHEN ele é removido e em seguida tenta abrir qualquer aba desse grupo
- THEN o sistema não mostra dados desse grupo
- AND ele não precisa sair e entrar de novo para que a remoção valha
- AND ele vê outro grupo do qual participa, com o aviso de que não participa mais do grupo anterior, ou o estado "sem grupo" se não restar nenhum

### Requirement: Saída do grupo
O sistema SHALL permitir que a pessoa saia de um grupo, pedindo confirmação, e SHALL manter o grupo consistente depois da saída.

#### Scenario: Sair com confirmação
- GIVEN uma pessoa na aba Grupo
- WHEN ela toca em "Sair deste grupo"
- THEN o botão muda para "Confirmar saída do grupo"
- AND só ao confirmar ela deixa de ser membro
- AND o sistema mostra "Você saiu do grupo."

#### Scenario: Último Administrador sai
- GIVEN a única Administradora sai e ainda restam outros membros
- WHEN a saída é confirmada
- THEN o membro mais antigo restante vira Administrador

#### Scenario: Último membro sai
- GIVEN a pessoa que sai é a única integrante do grupo
- WHEN a saída é confirmada
- THEN o grupo e seus convites são excluídos

### Requirement: Identificadores numéricos sem efeito sobre o acesso
O sistema SHALL tratar os ids inteiros e sequenciais de grupos, membros e convites como dados públicos e SHALL decidir o acesso apenas pela participação da pessoa no grupo.

#### Scenario: Adivinhar o id de outro grupo
- GIVEN a pessoa participa apenas do grupo de id 1
- WHEN ela tenta, pela interface ou por requisição direta ao servidor, usar o grupo de id 2 ou qualquer id que não é dela
- THEN recebe a mesma resposta de um grupo que não existe
- AND nenhuma informação sobre o grupo é revelada, nem se ele existe

#### Scenario: Id escolhido pelo cliente
- GIVEN uma requisição de criação de grupo ou de convite
- WHEN ela traz um campo `id` no corpo
- THEN o valor é ignorado e o id é gerado pelo banco

#### Scenario: Compartilhar o grupo
- GIVEN uma Administradora quer chamar alguém para o grupo
- WHEN ela usa o código do grupo ou o convite por e-mail
- THEN o id do grupo nunca é usado como forma de entrar

### Requirement: Seletor de grupo e pessoa no topo
O sistema SHALL mostrar na barra superior, ao lado do nome do app, o seletor de grupo, a inicial e o nome da pessoa autenticada e o botão "Sair".

#### Scenario: Conteúdo do topo
- GIVEN uma pessoa autenticada que participa de dois grupos
- WHEN qualquer aba é exibida
- THEN o topo mostra o seletor com os dois grupos, a inicial e o nome da pessoa e o botão "Sair"

#### Scenario: Seletor sem grupos
- GIVEN uma pessoa sem grupo
- WHEN o topo é exibido
- THEN o seletor de grupo não aparece
- AND o nome da pessoa e o botão "Sair" continuam visíveis

### Requirement: Pessoa sem grupo
O sistema SHALL orientar quem não participa de nenhum grupo a criar um ou entrar com um código.

#### Scenario: Sem grupos
- GIVEN uma pessoa que saiu de todos os grupos
- WHEN ela abre o app
- THEN vê a aba Grupo com o texto "Você ainda não participa de nenhum grupo. Crie um ou entre com um código."
- AND as abas Resumo e Lançamentos não mostram dados
