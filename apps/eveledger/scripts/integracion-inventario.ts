// Script de integración del Módulo 2 (inventarios), sin browser.
// Verifica: digitación de físico y compras, arrastre del inicial (físico de
// ayer), ventas derivadas del cierre CLOSED, teórica, variación y alerta.
import "dotenv/config";
import { crearCierre, guardarCierre, prepararNuevoCierre } from "../src/lib/cierres";
import {
  guardarInventarioDia,
  obtenerInventarioDia,
  inventarioMensual
} from "../src/lib/inventarios";
import { existenciaTeorica, variacion, alertaMerma } from "../src/lib/calc";
import { prisma } from "../src/lib/db";

const DIA1 = "2026-02-10";
const DIA2 = "2026-02-11";
const fechas = [new Date(`${DIA1}T00:00:00Z`), new Date(`${DIA2}T00:00:00Z`)];

let fallas = 0;
function check(nombre: string, cond: boolean) {
  console.log(`${cond ? "✔" : "✘"} ${nombre}`);
  if (!cond) fallas++;
}

async function limpiar() {
  await prisma.dailyClose.deleteMany({ where: { fecha: { in: fechas } } });
  await prisma.compra.deleteMany({ where: { fecha: { in: fechas } } });
  await prisma.inventarioFisico.deleteMany({ where: { fecha: { in: fechas } } });
}

async function main() {
  await limpiar();

  const productos = await prisma.product.findMany({ orderBy: { orden: "asc" } });
  check("hay productos configurados (seed)", productos.length > 0);

  // --- Día 1: solo se digita el físico (5000 gal por producto) ---
  const g1 = await guardarInventarioDia(
    DIA1,
    productos.map((p) => ({ productId: p.id, galones: 5000 })),
    []
  );
  check("guardar físico día 1", g1.ok);

  // --- Día 2: cierre CLOSED (100 gal × manguera) + compras + físico ---
  const c2 = await crearCierre(DIA2);
  check("crear cierre día 2", c2.ok);
  if (!c2.ok) throw new Error("no se pudo crear cierre día 2");

  const prep2 = await prepararNuevoCierre(DIA2);
  const lecturas2 = prep2.lecturas.map((l) => ({
    nozzleId: l.nozzleId,
    lecturaInicial: l.lecturaInicial,
    lecturaFinal: l.lecturaInicial + 100,
    calibracion: 0,
    precio: 10000
  }));
  const totalVentas2 = lecturas2.length * 100 * 10000;
  const cerrado = await guardarCierre(
    c2.id,
    {
      lecturas: lecturas2,
      pagos: [],
      vales: [],
      faltantes: [],
      efectivo: totalVentas2
    },
    true
  );
  check("cerrar día 2", cerrado.ok);

  // Ventas por producto = 100 gal × mangueras del producto.
  const nozzles = await prisma.nozzle.findMany();
  const ventasPorProducto = new Map<string, number>();
  for (const n of nozzles) {
    ventasPorProducto.set(n.productId, (ventasPorProducto.get(n.productId) ?? 0) + 100);
  }

  // Compras: dos descargas al primer producto (1200 + 800), físico = teórica + 50.
  const p0 = productos[0];
  const ventasP0 = ventasPorProducto.get(p0.id) ?? 0;
  const teoricaP0 = existenciaTeorica(5000, 2000, ventasP0);
  const g2 = await guardarInventarioDia(
    DIA2,
    [
      { productId: p0.id, galones: teoricaP0 + 50 },
      // El resto de productos sin físico digitado (null = eliminar/no guardar).
      ...productos.slice(1).map((p) => ({ productId: p.id, galones: null }))
    ],
    [
      { productId: p0.id, galones: 1200 },
      { productId: p0.id, galones: 800 }
    ]
  );
  check("guardar compras y físico día 2", g2.ok);

  // --- Formulario del día 2: inicial arrastrado, ventas del cierre ---
  const dia2 = await obtenerInventarioDia(DIA2);
  check("obtener inventario día 2", dia2 !== null && dia2.cierreCerrado);
  const filaP0 = dia2?.productos.find((p) => p.productId === p0.id);
  check("día 2: inicial = físico del día 1 (5000)", filaP0?.inicial === 5000);
  check("día 2: ventas derivadas del cierre CLOSED", filaP0?.ventas === ventasP0);
  check(
    "día 2: compras = suma de descargas (1200 + 800)",
    filaP0?.compras.reduce((a, b) => a + b, 0) === 2000
  );

  // --- Matriz mensual: teórica, variación y alerta ---
  const inv = await inventarioMensual(2026, 2);
  const mes0 = inv.productos.find((p) => p.id === p0.id);
  const fila11 = mes0?.dias.get(11);
  check("matriz: teórica = inicial + compras - ventas", fila11?.teorica === teoricaP0);
  check(
    "matriz: variación = físico - teórica (50)",
    fila11?.variacion !== null &&
      fila11?.variacion !== undefined &&
      Math.abs(fila11.variacion - 50) < 1e-9
  );
  check(
    "matriz: variación de 50 gal dispara la alerta",
    fila11?.teorica != null &&
      alertaMerma(variacion(teoricaP0 + 50, teoricaP0), teoricaP0) &&
      fila11.alerta === true
  );
  const fila10 = mes0?.dias.get(10);
  check(
    "matriz: día 10 tiene físico pero sin inicial (día 9 vacío) → sin variación",
    fila10?.fisico === 5000 && fila10?.variacion === null
  );

  // Producto sin físico el día 2: todo derivado queda en null.
  if (productos.length > 1) {
    const p1 = productos[1];
    const filaP1 = inv.productos.find((p) => p.id === p1.id)?.dias.get(11);
    check(
      "producto sin físico día 2: sin variación ni alerta",
      filaP1?.fisico === null && filaP1?.variacion === null && filaP1?.alerta === false
    );
    check("producto sin físico día 2: inicial sí arrastra (5000)", filaP1?.inicial === 5000);
  }

  // --- Validaciones del servidor ---
  const negativo = await guardarInventarioDia(DIA2, [{ productId: p0.id, galones: -10 }], []);
  check("servidor rechaza físico negativo", !negativo.ok);
  const compraNegativa = await guardarInventarioDia(DIA2, [], [{ productId: p0.id, galones: -5 }]);
  check("servidor rechaza descarga negativa", !compraNegativa.ok);
  const fechaMala = await guardarInventarioDia("11/02/2026", [], []);
  check("servidor rechaza fecha inválida", !fechaMala.ok);

  await limpiar();
  console.log("Datos de prueba eliminados.");
}

main()
  .then(() => {
    console.log(fallas === 0 ? "\nINTEGRACIÓN INVENTARIOS OK" : `\n${fallas} FALLAS`);
    process.exit(fallas === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
