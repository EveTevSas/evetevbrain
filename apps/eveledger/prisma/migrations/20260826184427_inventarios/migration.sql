-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "galones" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioFisico" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "galones" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "InventarioFisico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Compra_fecha_idx" ON "Compra"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "InventarioFisico_fecha_productId_key" ON "InventarioFisico"("fecha", "productId");

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioFisico" ADD CONSTRAINT "InventarioFisico_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
