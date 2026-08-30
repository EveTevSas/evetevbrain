-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cupo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abono" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abono_pkey" PRIMARY KEY ("id")
);

-- AlterTable: nuevas columnas (nullable para poder hacer el backfill)
ALTER TABLE "CreditSale" ADD COLUMN "clienteId" TEXT,
ADD COLUMN "facturaId" TEXT;

-- Backfill: un Cliente por cada nombre distinto ya registrado en vales
INSERT INTO "Cliente" ("id", "nombre", "cupo", "activo")
SELECT gen_random_uuid()::text, DISTINCT_CLIENTE.nombre, 0, true
FROM (SELECT DISTINCT "cliente" AS nombre FROM "CreditSale") AS DISTINCT_CLIENTE;

UPDATE "CreditSale" cs
SET "clienteId" = c."id"
FROM "Cliente" c
WHERE c."nombre" = cs."cliente";

-- AlterTable: clienteId pasa a NOT NULL y se elimina el texto libre
ALTER TABLE "CreditSale" ALTER COLUMN "clienteId" SET NOT NULL,
DROP COLUMN "cliente";

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nombre_key" ON "Cliente"("nombre");

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abono" ADD CONSTRAINT "Abono_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
