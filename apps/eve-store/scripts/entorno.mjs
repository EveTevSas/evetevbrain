/* Carga `.env.local` en `process.env`, para los scripts que se corren a mano.
 *
 * POR QUÉ EXISTE. Next lee `.env.local` solo; un `node scripts/loquesea.mjs`,
 * no. `comprobar-credenciales.mjs` se lo montaba por su cuenta —tiene que leer
 * el archivo crudo de todas formas, porque reescribe la cadena cuando encuentra
 * una variante que conecta— y los otros dos daban por hecho que la variable ya
 * estaba exportada. No lo está, así que `db:check` y `db:import` fallaban con
 * «Falta DATABASE_URL» aunque el archivo estuviera perfecto y `creds` dijera
 * que sí. Tres de los cuatro comandos del README no funcionaban como estaban
 * escritos.
 *
 * NO PISA LO QUE YA VENGA PUESTO. Si alguien exporta `DATABASE_URL` en la
 * terminal para apuntar a otra base un rato, manda esa y no el archivo: es lo
 * que se espera de un `.env` en todas partes, y lo contrario convierte una
 * prueba puntual en una sorpresa.
 *
 * No imprime ningún valor, nunca. Estos archivos son llaves.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function cargarEntorno() {
  const ruta = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  if (!existsSync(ruta)) return;

  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const corte = limpia.indexOf("=");
    if (corte < 1) continue;

    const clave = limpia.slice(0, corte).trim();
    let valor = limpia.slice(corte + 1).trim();

    /* Las comillas del archivo no son parte del valor. Una cadena entre
       comillas llegaba con ellas y Postgres la rechazaba con un error que no
       menciona las comillas por ninguna parte. */
    if (valor.length > 1 && valor[0] === valor.at(-1) && (valor[0] === '"' || valor[0] === "'")) {
      valor = valor.slice(1, -1);
    }

    process.env[clave] ??= valor;
  }
}
