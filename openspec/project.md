# Caixa Comum

## Visão geral
Caixa Comum é um aplicativo de controle financeiro em grupo. Cada pessoa tem a própria conta (login) e vários usuários compartilham o mesmo caixa: registram entradas e saídas, veem o saldo do mês e acompanham quem lançou o quê. O uso típico é a casa, um casal, uma viagem ou um pequeno projeto.

Existe um protótipo navegável em `openspec/prototype/Caixa Comum.html` que serve de referência visual e de comportamento. Os dados dele ficam só no navegador e o login é simulado. Este projeto especifica a versão real, com servidor e banco de dados. Toda tela deve ser conferida contra o protótipo antes de ser implementada.

## Stack
Segue por inteiro o padrão do projeto matilha-app (`C:\Projeto\matilha-app`). Na dúvida sobre estrutura, nomes ou configuração, o matilha-app é a referência.

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) com TypeScript estrito, entregue como PWA instalável |
| Banco de dados | PostgreSQL. Em produção, Supabase usado só como Postgres gerenciado (pooler na porta 6543 para o app, conexão direta na 5432 para migrações) |
| ORM e migrações | Prisma 5 (`prisma migrate`) |
| Autenticação | Auth.js (NextAuth) v5, provider Credentials com bcrypt e sessão JWT |
| Escrita e leitura | Server Actions (`src/lib/actions`) e Server Components. Route handlers só para Auth.js e cron |
| Validação | Zod (`src/lib/validators`) |
| Estilo | Tailwind CSS |
| Gráficos | Recharts |
| E-mail | nodemailer com SMTP. Sem SMTP em desenvolvimento, o link é impresso no console |
| Testes | Vitest (ambiente `node`, contra Postgres real) e Playwright para ponta a ponta |
| Desenvolvimento local | Docker Compose com Postgres |
| Deploy | Vercel (app e Vercel Cron) e GitHub Actions (CI e aplicação das migrações em produção) |

Não usar Supabase Auth, `supabase-js` nem segurança por linha (RLS). Não usar Redux: estado de servidor via Server Components e Server Actions, estado de UI local via React state.

## Isolamento entre grupos (regra arquitetural crítica)
- Toda tabela de dados de um grupo tem a coluna obrigatória `grupoId`.
- Nenhuma consulta do Prisma a dados de grupo pode ser feita sem filtrar por `grupoId`. Um erro aqui vaza dados financeiros de um grupo para outro.
- O grupo ativo vem de um único helper (`getGrupoAtual()`), que confere no banco se a pessoa ainda participa do grupo. Nenhum código lê o grupo direto de cookie, parâmetro ou corpo da requisição.
- Todo recurso novo ganha um teste de isolamento: com a sessão de um grupo, buscar por id um registro de outro grupo devolve o mesmo resultado de um registro inexistente.

## Convenções
- Idioma da interface, dos textos de erro e do código de domínio: português do Brasil
- Models, campos e enums do Prisma em português (`Grupo`, `Lancamento`, `grupoId`, `criadoEm`), com tabelas mapeadas em `snake_case` no plural via `@@map`
- Toda chave primária é `Int @default(autoincrement())`. A exceção é tabela de vínculo, que usa chave composta, como `UsuarioClinica` no matilha-app
- Ids sequenciais são previsíveis e nunca contam como segredo. O que se compartilha é o código do grupo ou o link de convite, nunca o id
- Moeda única: real (BRL). Valores em `Decimal @db.Decimal(10, 2)`, nunca `Float`. Contas com dinheiro ficam no Postgres ou em `Prisma.Decimal`, nunca em `number` do JavaScript. Exibição com `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`
- Datas de lançamento são datas de calendário (`@db.Date`), no fuso America/Sao_Paulo
- Toda regra de permissão é verificada no servidor, dentro da própria Server Action. A interface esconder um botão nunca substitui essa verificação
- Mensagens de erro dizem o que houve e como corrigir, sem culpar a pessoa
- Variáveis de ambiente obrigatórias são validadas na inicialização (`src/lib/env.ts`)

## Glossário
- **Lançamento**: um registro de dinheiro que entrou ou saiu
- **Entrada**: lançamento que soma ao saldo (salário, aporte, extra)
- **Saída**: lançamento que subtrai do saldo (aluguel, mercado, lazer)
- **Grupo**: conjunto de pessoas que compartilham um caixa. É o tenant do sistema
- **Participação**: vínculo de uma pessoa com um grupo, com um papel
- **Administrador**: membro com poderes extras no grupo (convidar, remover, excluir lançamentos de outros)
- **Membro**: participante comum do grupo
- **Código do grupo**: texto curto que permite entrar no grupo sem convite por e-mail
- **Convite**: link com token único, enviado por e-mail, que permite entrar no grupo depois de provar a posse do e-mail

## Restrições importantes
- Dados financeiros são sensíveis: senhas são guardadas apenas como hash bcrypt e nenhuma consulta pode devolver dados de um grupo a quem não é membro
- A interface precisa funcionar bem em tela de celular (cerca de 400 px de largura) antes de qualquer outra
- Fora do escopo desta primeira versão: edição de lançamento, lançamentos recorrentes, anexos, importação de extrato, orçamento por categoria, várias moedas e app nativo de loja
