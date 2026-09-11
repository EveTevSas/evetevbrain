/**
 * CSV para los exportes de la consola: separador `;` (el que Excel en español
 * abre sin asistente), BOM UTF-8 para que las tildes lleguen bien, y comillas
 * donde hace falta. Los montos van en la unidad mínima como enteros: quien
 * abre el archivo no debería tener que adivinar decimales.
 */
export interface ColumnaCsv<T> {
  titulo: string;
  valor: (fila: T) => unknown;
}

function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s =
    v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function aCsv<T>(filas: T[], columnas: ColumnaCsv<T>[]): string {
  const cabecera = columnas.map((c) => celda(c.titulo)).join(";");
  const cuerpo = filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(";"));
  return "﻿" + [cabecera, ...cuerpo].join("\r\n") + "\r\n";
}
