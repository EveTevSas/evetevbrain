import type { Fragmento } from "../base/tipos.js";

/** Saca del `_sistema.md` **solo** lo que va bajo `## Prompt`. El resto del
 *  archivo explica por que cada regla tiene un verificador, y eso es para
 *  nosotros, no para el modelo. */
export function extraerPromptDeSistema(markdown: string): string {
  const desde = /^##\s+Prompt\s*$/m.exec(markdown);
  if (!desde) throw new Error("_sistema.md no tiene una seccion `## Prompt`");
  const resto = markdown.slice(desde.index + desde[0].length);
  const hasta = /^##\s+/m.exec(resto);
  const seccion = hasta ? resto.slice(0, hasta.index) : resto;
  // Las lineas de cita son la nota para nosotros que encabeza la seccion.
  return seccion
    .split("\n")
    .filter((l) => !l.startsWith(">"))
    .join("\n")
    .trim();
}

/** Arma el mensaje del usuario: los fragmentos con su identificador, y la
 *  pregunta.
 *
 *  Los fragmentos van en el mensaje del **usuario** y no en el del sistema, a
 *  proposito: asi el sistema es identico en cada peticion y el cache de
 *  contexto acierta. En Kimi la entrada cacheada cuesta un orden de magnitud
 *  menos que la que no lo esta. */
export function armarMensaje(consulta: string, fragmentos: Fragmento[]): string {
  const bloques = fragmentos.map((f) => `[#${f.id}] ${f.titulo} > ${f.seccion}\n${f.texto}`);
  return [
    "Fragmentos de la base documental:",
    "",
    bloques.join("\n\n---\n\n"),
    "",
    "===",
    "",
    `Pregunta: ${consulta}`
  ].join("\n");
}
