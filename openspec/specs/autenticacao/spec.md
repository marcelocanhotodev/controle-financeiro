# autenticacao Specification

## Purpose
Cadastro, autenticação e sessão das pessoas que usam o Caixa Comum.

## Requirements

### Requirement: Cadastro de conta
O sistema SHALL permitir que uma pessoa crie uma conta informando nome, e-mail e senha.

#### Scenario: Cadastro válido
- GIVEN uma pessoa sem conta
- WHEN ela envia nome, e-mail válido e senha com pelo menos 8 caracteres
- THEN a conta é criada
- AND a pessoa entra no sistema já autenticada

#### Scenario: Nome em branco
- GIVEN o formulário de cadastro
- WHEN a pessoa envia o nome vazio
- THEN o sistema mostra "Informe seu nome."
- AND nenhuma conta é criada

#### Scenario: E-mail inválido
- GIVEN o formulário de cadastro
- WHEN a pessoa envia um e-mail sem formato válido
- THEN o sistema mostra "Informe um e-mail válido."

#### Scenario: Senha curta
- GIVEN o formulário de cadastro
- WHEN a pessoa envia uma senha com menos de 8 caracteres
- THEN o sistema mostra que a senha precisa ter pelo menos 8 caracteres
- AND nenhuma conta é criada

#### Scenario: E-mail já cadastrado
- GIVEN já existe uma conta com o e-mail "ana@exemplo.com"
- WHEN alguém tenta criar conta com "ANA@exemplo.com"
- THEN o sistema recusa o cadastro
- AND orienta a usar a opção de entrar

### Requirement: Armazenamento seguro de senha
O sistema SHALL guardar apenas um hash bcrypt de cada senha, SHALL NOT guardar a senha em texto em lugar algum e SHALL NOT devolver a senha nem o hash em nenhuma resposta ou página.

#### Scenario: Senha nunca em texto
- GIVEN uma conta criada com a senha "senha-forte-123"
- WHEN o banco de dados é inspecionado
- THEN o texto "senha-forte-123" não existe em nenhum registro
- AND o registro da pessoa guarda apenas o hash bcrypt

#### Scenario: Hash fora das respostas
- GIVEN uma pessoa autenticada
- WHEN qualquer página, resposta de ação do servidor ou sessão é inspecionada
- THEN nenhuma delas contém o hash da senha

### Requirement: Identificador da conta
O sistema SHALL identificar cada conta por um id inteiro gerado pelo banco e SHALL guardar o e-mail em minúsculas.

#### Scenario: Conta criada recebe id do banco
- GIVEN um cadastro válido com o e-mail "Marcelo@Exemplo.com"
- WHEN a conta é criada
- THEN ela recebe um id inteiro gerado pelo banco
- AND o e-mail fica guardado como "marcelo@exemplo.com"

#### Scenario: Cadastro que falha não deixa resíduo
- GIVEN um cadastro com código de grupo inexistente
- WHEN o sistema recusa o cadastro
- THEN não resta conta nem participação em grupo criadas por essa tentativa

### Requirement: Entrada em grupo durante o cadastro
O sistema SHALL permitir informar um código de grupo opcional no cadastro e SHALL garantir que toda conta criada pela tela de cadastro termine participando de pelo menos um grupo.

#### Scenario: Cadastro com código válido
- GIVEN existe o grupo "Finanças da Casa" com o código "CASA-2026"
- WHEN a pessoa se cadastra informando "casa-2026"
- THEN a conta é criada como Membro desse grupo
- AND o código é aceito sem diferenciar maiúsculas de minúsculas

#### Scenario: Cadastro sem código
- GIVEN a pessoa "Marcelo Souza"
- WHEN ela se cadastra deixando o código em branco
- THEN o sistema cria o grupo "Grupo de Marcelo"
- AND ela é Administradora desse grupo

#### Scenario: Código inexistente
- GIVEN o formulário de cadastro
- WHEN a pessoa informa um código que não existe
- THEN o sistema mostra "Não encontramos nenhum grupo com este código."
- AND nenhuma conta é criada

#### Scenario: Cadastro não procura convites pelo e-mail
- GIVEN existe um convite pendente para "pedro@exemplo.com" no grupo "Finanças da Casa"
- WHEN uma pessoa se cadastra pela tela de cadastro com esse e-mail, sem usar o link do convite
- THEN ela não entra em "Finanças da Casa"
- AND o convite continua pendente

### Requirement: Tela de login
O sistema SHALL apresentar o acesso em duas opções, "Entrar" e "Criar conta", numa mesma tela.

#### Scenario: Alternar entre entrar e criar conta
- GIVEN a tela de login
- WHEN a pessoa toca em "Criar conta"
- THEN aparece o formulário com nome, e-mail, senha e código do grupo opcional
- AND os erros do outro formulário são limpos

#### Scenario: Mensagens de erro no formulário
- GIVEN um envio inválido
- WHEN o formulário é exibido de novo
- THEN a mensagem de erro aparece dentro do formulário com `role="alert"`
- AND o foco vai para o primeiro campo com problema

#### Scenario: Link para recuperar a senha
- GIVEN a tela de login na opção "Entrar"
- WHEN ela é exibida
- THEN existe o link "Esqueci minha senha", que leva à tela de recuperação de senha

### Requirement: Login por e-mail e senha
O sistema SHALL autenticar a pessoa com e-mail e senha, sem diferenciar maiúsculas de minúsculas no e-mail.

#### Scenario: Credenciais corretas
- GIVEN uma conta existente
- WHEN a pessoa envia o e-mail e a senha corretos
- THEN ela entra no sistema
- AND vê na aba Resumo o último grupo que usou, se ainda participa dele, ou senão o primeiro grupo em que entrou

#### Scenario: Credenciais incorretas
- GIVEN uma conta existente
- WHEN a pessoa envia uma senha errada ou um e-mail que não existe
- THEN o sistema mostra a mesma mensagem nos dois casos: "E-mail ou senha incorretos."
- AND não revela se o e-mail está cadastrado

### Requirement: Sessão e logout
O sistema SHALL manter a pessoa autenticada por um cookie de sessão `httpOnly` e SHALL encerrar a sessão quando ela sair.

#### Scenario: Sessão sobrevive ao recarregar
- GIVEN uma pessoa autenticada
- WHEN ela recarrega a página ou volta ao app no dia seguinte
- THEN continua autenticada até a sessão expirar

#### Scenario: Sair
- GIVEN uma pessoa autenticada
- WHEN ela toca em "Sair"
- THEN o cookie de sessão é removido
- AND a tela de login é exibida
- AND voltar a uma página interna exige entrar de novo

### Requirement: Proteção de acesso
O sistema SHALL exigir autenticação em toda página interna e em toda ação que lê ou grava dados.

#### Scenario: Página interna sem login
- GIVEN uma pessoa não autenticada
- WHEN ela abre qualquer página interna
- THEN é levada à tela de login

#### Scenario: Ação sem login
- GIVEN uma pessoa não autenticada
- WHEN ela faz uma requisição direta ao servidor para ler ou gravar dados
- THEN a ação é recusada
- AND nada é lido nem alterado

#### Scenario: Páginas públicas
- GIVEN uma pessoa não autenticada
- WHEN ela abre a tela de login, a de cadastro, a de recuperação de senha, um link de definir senha ou um link de convite
- THEN a página é exibida sem exigir login

### Requirement: Recuperação de senha
O sistema SHALL permitir que a pessoa que esqueceu a senha peça, pelo e-mail da conta, um link de definir senha válido por 1 hora, e SHALL dar a mesma resposta exista ou não uma conta com o e-mail informado.

#### Scenario: Pedir link com conta existente
- GIVEN existe uma conta com o e-mail "ana@exemplo.com"
- WHEN alguém informa "ANA@exemplo.com" na tela de recuperação de senha
- THEN o endereço recebe um e-mail com um link de definir senha válido por 1 hora
- AND o sistema mostra "Se houver uma conta com este e-mail, enviamos um link."

#### Scenario: Pedir link sem conta
- GIVEN não existe conta com o e-mail "ninguem@exemplo.com"
- WHEN alguém o informa na tela de recuperação de senha
- THEN nenhum e-mail é enviado
- AND o sistema mostra a mesma mensagem do caso com conta

#### Scenario: Pedidos seguidos
- GIVEN um link de redefinição foi pedido para uma conta há menos de 60 segundos
- WHEN alguém pede de novo para o mesmo e-mail
- THEN nenhum e-mail novo é enviado
- AND o sistema mostra a mesma mensagem

#### Scenario: Redefinir a senha pelo link
- GIVEN Ana recebeu um link de redefinição válido
- WHEN ela o abre e envia uma nova senha com pelo menos 8 caracteres
- THEN a nova senha passa a valer e a antiga deixa de funcionar
- AND Ana entra no sistema já autenticada
- AND os outros links de redefinição pedidos por ela deixam de funcionar

#### Scenario: Nova senha curta
- GIVEN um link de redefinição válido
- WHEN a pessoa envia uma senha com menos de 8 caracteres
- THEN o sistema mostra que a senha precisa ter pelo menos 8 caracteres
- AND a senha não muda

### Requirement: Link de definir senha
O sistema SHALL usar um mesmo tipo de link para definir senha na criação de conta por convite e na recuperação de senha, e SHALL tornar cada link de uso único e guardar apenas um hash dele.

#### Scenario: Link usado, expirado ou inexistente
- GIVEN um link de definir senha já usado, vencido ou com valor que não existe
- WHEN alguém o abre
- THEN o sistema mostra "Este link não é mais válido."
- AND, se o link era de recuperação de senha, oferece pedir um novo
- AND, se o link era de convite, orienta a pedir um novo convite a quem administra o grupo
- AND nenhuma senha é definida

#### Scenario: Link fora do banco
- GIVEN um link de definir senha foi enviado
- WHEN o banco de dados é inspecionado
- THEN o valor do link não aparece em nenhum registro, apenas um hash dele

### Requirement: Sessões encerradas ao redefinir a senha
O sistema SHALL encerrar, a partir da próxima ação, todas as sessões da pessoa abertas antes da redefinição de senha, exceto a sessão iniciada pela própria redefinição.

#### Scenario: Outro aparelho perde a sessão
- GIVEN Ana está autenticada no notebook
- WHEN ela redefine a senha pelo link no celular
- THEN o celular continua autenticado
- AND a próxima página ou ação no notebook leva à tela de login
- AND nenhum dado é lido nem alterado por essa ação
