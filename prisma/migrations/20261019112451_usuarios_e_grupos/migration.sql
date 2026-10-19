-- CreateEnum
CREATE TYPE "PapelGrupo" AS ENUM ('ADMIN', 'MEMBRO');

-- CreateEnum
CREATE TYPE "EnvioConviteStatus" AS ENUM ('ENVIADO', 'FALHOU');

-- CreateEnum
CREATE TYPE "FinalidadeTokenSenha" AS ENUM ('CRIAR', 'REDEFINIR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "grupoAtivoId" INTEGER,
    "senhaAlteradaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacoes" (
    "usuarioId" INTEGER NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "papel" "PapelGrupo" NOT NULL,
    "entrouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participacoes_pkey" PRIMARY KEY ("usuarioId","grupoId")
);

-- CreateTable
CREATE TABLE "convites" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criadoPorId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "aceitoEm" TIMESTAMP(3),
    "envioStatus" "EnvioConviteStatus",
    "envioErro" TEXT,
    "envioEm" TIMESTAMP(3),

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_senha" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "finalidade" "FinalidadeTokenSenha" NOT NULL,
    "email" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "conviteId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),

    CONSTRAINT "tokens_senha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_codigo_key" ON "grupos"("codigo");

-- CreateIndex
CREATE INDEX "participacoes_grupoId_idx" ON "participacoes"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "convites_token_key" ON "convites"("token");

-- CreateIndex
CREATE INDEX "convites_grupoId_idx" ON "convites"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_senha_tokenHash_key" ON "tokens_senha"("tokenHash");

-- CreateIndex
CREATE INDEX "tokens_senha_usuarioId_idx" ON "tokens_senha"("usuarioId");

-- CreateIndex
CREATE INDEX "tokens_senha_conviteId_idx" ON "tokens_senha"("conviteId");

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacoes" ADD CONSTRAINT "participacoes_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_senha" ADD CONSTRAINT "tokens_senha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_senha" ADD CONSTRAINT "tokens_senha_conviteId_fkey" FOREIGN KEY ("conviteId") REFERENCES "convites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

