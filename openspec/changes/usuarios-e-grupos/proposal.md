# Proposal: Usuários e grupos

## Why
Segunda das quatro partes do Caixa Comum (ver `openspec/project.md`). Antes de registrar qualquer lançamento, cada pessoa precisa de uma conta, e todo dado precisa pertencer a um grupo do qual ela participa. Esta parte entrega contas, grupos e o isolamento entre grupos, que é a base de segurança para `lancamentos` e `resumo-mensal`.

## What Changes
- Cadastro, login e logout com e-mail e senha, tela "Entrar / Criar conta" e proteção das páginas internas
- Grupos com Administrador e Membro, código do grupo, entrada por código e troca entre vários grupos pelo seletor do topo
- Convite por e-mail com link e token, válido por 7 dias, aceito pela própria pessoa convidada, tenha ela conta ou não, mais reenvio e cancelamento
- Link de definir senha, único para dois usos: a pessoa convidada sem conta cria a própria conta (nome e senha) por ele, e quem esqueceu a senha a redefine por ele. Redefinir a senha encerra as sessões abertas em outros aparelhos
- Lista de membros, remoção com confirmação, saída do grupo com promoção do membro mais antigo e exclusão do grupo vazio
- Barra superior completa: seletor de grupo, nome da pessoa e "Sair"
- Contas e grupos de exemplo só no ambiente de desenvolvimento

Ajustes em relação ao protótipo (`openspec/prototype/Caixa Comum.html`):
- Senha com no mínimo 8 caracteres, guardada só como hash. O protótipo aceitava 4 e guardava em texto
- O convite vira um link com token aceito pela pessoa convidada. O protótipo adicionava direto quem já tinha conta e resolvia o convite pelo e-mail no cadastro, sem provar a posse do e-mail
- A mensagem ao Administrador depois de convidar não revela se o e-mail já tem conta
- O Administrador convida só pelo e-mail e nunca define a senha de ninguém. A conta da pessoa convidada só nasce quando ela mesma define a senha pelo link
- Ids inteiros sequenciais, com acesso decidido só pela participação no grupo

Fora do escopo: edição de perfil, troca de e-mail, exclusão de conta, troca de senha estando autenticado (fora do "esqueci minha senha"), promoção manual de Membro a Administrador e limite de tentativas de login.

## Capabilities

### New Capabilities
- `autenticacao`: conta, tela de login, login, sessão, recuperação de senha, link de definir senha e proteção de acesso
- `grupos`: grupos, papéis, código, convites, membros, grupo ativo e seletor do topo

### Modified Capabilities
Nenhuma. O seletor do topo é um requisito novo de `grupos`, e a barra superior de `estrutura-app` continua valendo como está.

## Impact
- Depende de `estrutura-base` arquivada
- Primeiras tabelas: `usuarios`, `grupos`, `participacoes`, `convites` e `tokens_senha`
- Dependências novas: `next-auth@5`, `bcryptjs` e `nodemailer`
- Variáveis novas: `AUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `EMAIL_FROM`
- Serviço externo: servidor SMTP para os convites e para os links de definir senha
