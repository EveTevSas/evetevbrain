-- CreateEnum
CREATE TYPE "CloseStatus" AS ENUM ('DRAFT', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TRANSPORTADORA', 'CREDIBANCO', 'REDEBAN', 'OTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nozzle" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Nozzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyClose" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "CloseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "DailyClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NozzleReading" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "lecturaInicial" DECIMAL(14,3) NOT NULL,
    "lecturaFinal" DECIMAL(14,3) NOT NULL,
    "calibracion" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "precio" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "NozzleReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "tipo" "PaymentType" NOT NULL,
    "detalle" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditSale" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "CreditSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShortage" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "empleado" TEXT NOT NULL,
    "faltante" DECIMAL(14,2) NOT NULL,
    "abono" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "EmployeeShortage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DailyClose_fecha_key" ON "DailyClose"("fecha");

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "DailyClose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleReading" ADD CONSTRAINT "NozzleReading_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "DailyClose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditSale" ADD CONSTRAINT "CreditSale_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "DailyClose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShortage" ADD CONSTRAINT "EmployeeShortage_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "DailyClose"("id") ON DELETE CASCADE ON UPDATE CASCADE;
