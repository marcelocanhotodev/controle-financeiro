-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" SERIAL NOT NULL,
    "grupoId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluidoEm" TIMESTAMP(3),

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lancamentos_grupoId_data_idx" ON "lancamentos"("grupoId", "data" DESC);

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Valor sempre positivo: o sinal vem de "tipo" (design.md, "Dinheiro em Decimal(10, 2)").
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_valor_positivo" CHECK ("valor" > 0);
