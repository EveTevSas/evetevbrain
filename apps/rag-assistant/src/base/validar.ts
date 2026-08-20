import { frases } from "./frases.js";
import { sinTildes } from "../normalizar.js";
import { LISTAS, type DocumentoCrudo } from "./leer.js";
import type { Reglas } from "./reglas.js";
import type { Fallo } from "./tipos.js";

/** Valida el corpus entero y devuelve **todos** los fallos, no el primero.
 *  Quien escribe la base merece la lista completa de una pasada. */
export function validar(crudos: DocumentoCrudo[], reglas: Reglas): Fallo[] {
  const fallos: Fallo[] = [];
  const vistos = new Map<string, string>();
  const exentos = new Set(reglas.configuracion.archivos);

  // Todo se compara **sin tildes**, patrones incluidos. Si no, un documento
  // escrito sin acentos —cosa habitual cuando escribe otra persona— esquiva las
  // reglas en silencio: «ya esta en produccion» pasaria y «ya está en
  // producción» no. Una guarda que depende de la ortografia no es una guarda.
  const patronDisponibilidad = new RegExp(sinTildes(reglas.disponibilidad.patron), "i");
  const patronTarifa = new RegExp(sinTildes(reglas.tarifas.patron), "i");
  const patronMesAno = new RegExp(sinTildes(reglas.promesasDeFecha.patronMesAno), "i");

  for (const doc of crudos) {
    const nombre = doc.ruta.split("/").pop() ?? doc.ruta;
    const anota = (tipo: string, detalle: string, linea?: number) =>
      fallos.push({ ruta: doc.ruta, tipo, detalle, ...(linea === undefined ? {} : { linea }) });

    // --- frontmatter ---------------------------------------------------
    if (Object.keys(doc.meta).length === 0) {
      anota("frontmatter", "el archivo no tiene bloque de frontmatter");
      continue;
    }
    for (const campo of reglas.frontmatter.obligatorios) {
      if (!doc.meta[campo]) anota("frontmatter", `falta «${campo}»`);
    }
    for (const campo of ["producto", "audiencia", "confianza"] as const) {
      const valor = doc.meta[campo];
      if (valor && !LISTAS[campo].includes(valor)) {
        anota("frontmatter", `${campo}=«${valor}» no está en la lista permitida`);
      }
    }
    const fuente = doc.meta["fuente"];
    if (fuente && !reglas.frontmatter.fuente.includes(fuente)) {
      anota("frontmatter", `fuente=«${fuente}» no está en la lista permitida`);
    }
    if (doc.meta["vigencia"] && !/^\d{4}-\d{2}-\d{2}$/.test(doc.meta["vigencia"])) {
      anota("frontmatter", `vigencia=«${doc.meta["vigencia"]}» no es una fecha AAAA-MM-DD`);
    }

    // --- id único -------------------------------------------------------
    // Un id repetido rompería la verificación de citas en silencio: el modelo
    // citaría un id que existe, pero apuntando a otro documento.
    const id = doc.meta["id"];
    if (id) {
      const previo = vistos.get(id);
      if (previo) anota("id", `«${id}» ya lo declara ${previo}`);
      else vistos.set(id, doc.ruta);
    }

    // --- reglas de contenido -------------------------------------------
    // Los archivos de configuración DESCRIBEN las prohibiciones, así que las
    // contienen por definición. `_selladas.md` no está exento a propósito: su
    // texto es el que la persona recibe literalmente.
    if (exentos.has(nombre)) continue;

    const cuerpo = doc.cuerpo;
    const plano = sinTildes(cuerpo);
    const enMinusculas = plano.toLowerCase();

    for (const frase of reglas.frasesVetadas) {
      if (enMinusculas.includes(sinTildes(frase).toLowerCase())) {
        anota("frase vetada", frase, linea(cuerpo, frase));
      }
    }

    if (!doc.ruta.startsWith("legales/")) {
      for (const competidor of reglas.competidores) {
        const patron = new RegExp(`\\b${escapar(sinTildes(competidor))}\\b`, "i");
        if (patron.test(plano)) anota("competidor", competidor, linea(cuerpo, competidor));
      }
    }

    for (const frase of reglas.promesasDeFecha.frases) {
      if (enMinusculas.includes(sinTildes(frase).toLowerCase())) {
        anota("promesa de fecha", frase, linea(cuerpo, frase));
      }
    }
    if (patronMesAno.test(plano)) anota("promesa de fecha", "un mes con año");

    if (
      patronTarifa.test(plano) &&
      !reglas.tarifas.exigeAlgunaDe.some((p) => enMinusculas.includes(sinTildes(p).toLowerCase()))
    ) {
      anota("tarifa", "habla de tarifas sin decir que son de referencia ni derivar a cotización");
    }

    for (const f of frases(plano)) {
      if (!patronDisponibilidad.test(f)) continue;
      const negada = reglas.disponibilidad.exigeNegacionEnLaFrase.some((n) =>
        f.toLowerCase().includes(sinTildes(n).toLowerCase())
      );
      if (!negada) anota("disponibilidad", recortar(f), linea(cuerpo, f.slice(0, 30)));
    }
  }

  return fallos;
}

/** Documentos cuya `vigencia` ya pasó. No son un fallo: siguen respondiéndose,
 *  pero bajan a confianza media y salen en el informe mensual. Sacarlos del
 *  índice dejaría al asistente mudo sobre algo que sí sabe. */
export function vencidos(crudos: DocumentoCrudo[], hoy = new Date()): DocumentoCrudo[] {
  const corte = hoy.toISOString().slice(0, 10);
  return crudos.filter((d) => {
    const v = d.meta["vigencia"];
    return Boolean(v) && v! < corte;
  });
}

function linea(cuerpo: string, aguja: string): number | undefined {
  const lineas = cuerpo.split(/\r?\n/);
  const objetivo = sinTildes(aguja).toLowerCase();
  for (let i = 0; i < lineas.length; i++) {
    if (
      sinTildes(lineas[i] ?? "")
        .toLowerCase()
        .includes(objetivo)
    )
      return i + 1;
  }
  return undefined;
}

function recortar(texto: string): string {
  return texto.length > 90 ? `${texto.slice(0, 87)}…` : texto;
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
