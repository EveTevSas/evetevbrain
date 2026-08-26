-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('NOMINA', 'SERVICIOS', 'FLETES', 'OTROS');

-- CreateTable
CREATE TABLE "CostoProductoMes" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "precioCompra" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "flete" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CostoProductoMes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastoOperativo" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "cantidad" DECIMAL(14,3),
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastoOperativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CostoProductoMes_anio_mes_productId_key" ON "CostoProductoMes"("anio", "mes", "productId");

-- CreateIndex
CREATE INDEX "GastoOperativo_anio_mes_idx" ON "GastoOperativo"("anio", "mes");

-- AddForeignKey
ALTER TABLE "CostoProductoMes" ADD CONSTRAINT "CostoProductoMes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
