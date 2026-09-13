/* ¿La tienda está abierta al público?
 *
 * CERRADA POR DEFECTO, y ésa es toda la idea. La variable tiene que estar
 * puesta a `1` para que la tienda se vea; sin ella —una variable que se olvida,
 * un entorno nuevo, un proyecto de Vercel recién creado, una vista previa— la
 * tienda queda en construcción. El fallo posible es «sigue cerrada más tiempo
 * del debido», que se nota y se arregla en un minuto. El contrario es que un
 * catálogo a medio revisar salga a la venta sin que nadie lo decida.
 *
 * Es la misma disciplina que ya gobierna el schema: `publicado boolean not null
 * default false`. Nada sale a producción porque sí.
 *
 * POR QUÉ NO SE DEDUCE DEL DATO. El resto de este código evita las banderas a
 * mano por buenas razones —las landings arrastraron un `noindex` durante meses
 * porque nadie se acordó de quitarlo— y `robots.ts` y la portada deciden con
 * `publicados().length > 0`. Pero ese dato ya no alcanza: hay veinticuatro
 * productos publicados y la tienda **no** está lista. «Hay catálogo» y «se puede
 * vender» dejaron de ser la misma pregunta, así que hace falta una respuesta
 * aparte. No es deducible: es una decisión comercial.
 *
 * ESTO NO ES UNA CERRADURA. Es un letrero y un `noindex`: evita que la tienda
 * se indexe y que un cliente compre sin querer, pero el código y las rutas
 * siguen ahí. Para que no llegue ni una petición hay que activar Deployment
 * Protection en el proyecto de Vercel, que es un ajuste del panel y no del
 * repositorio.
 */
export const tiendaAbierta = process.env.TIENDA_ABIERTA === "1";

/** Las rutas que siguen vivas con la tienda cerrada: el panel y su acceso. */
export const RUTAS_SIEMPRE_ABIERTAS = ["/panel", "/entrar", "/sin-acceso", "/en-construccion"];
