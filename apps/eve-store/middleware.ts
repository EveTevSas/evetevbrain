import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { RUTAS_SIEMPRE_ABIERTAS, tiendaAbierta } from "@/lib/apertura";

/* Refresca la sesión en cada petición y cierra el panel entero.
 *
 * El middleware NO decide si alguien es administrador: para eso hay que
 * consultar `tienda.administrador`, y este código corre en el borde, sin
 * conexión a Postgres. Aquí solo se comprueba que haya sesión; la autorización
 * la hace el layout, que sí tiene base de datos. Dos capas, cada una donde
 * puede hacer su trabajo.
 */
/* Solo `/panel` está cerrado. La raíz queda libre porque ahí irá la tienda, que
   por definición es pública — y que llegue antes la restricción que la tienda
   sería fácil de olvidar el día que se monte. */
const PROTEGIDO = "/panel";

export async function middleware(peticion: NextRequest) {
  /* Con la tienda cerrada, todo lo público es el letrero de obras.
   *
   * Va aquí y no en cada página a propósito: si la comprobación viviera en las
   * pantallas, la página que alguien añada dentro de tres meses se saltaría la
   * puerta sin que nada fallara. Es el mismo criterio que pone la regla de
   * publicación en un disparador de la base y no en la aplicación — a un `if`
   * central no se le olvida.
   *
   * Es `rewrite` y no `redirect`: la URL no cambia, así que quien llegue a una
   * ficha por un enlace viejo no se lleva un 301 que luego haya que deshacer
   * cuando la tienda abra.
   *
   * El panel sigue vivo: la tienda está cerrada al público, no a quien la está
   * montando. */
  const ruta = peticion.nextUrl.pathname;
  if (!tiendaAbierta && !RUTAS_SIEMPRE_ABIERTAS.some((r) => ruta.startsWith(r))) {
    const obras = peticion.nextUrl.clone();
    obras.pathname = "/en-construccion";
    obras.search = "";
    return NextResponse.rewrite(obras);
  }

  let respuesta = NextResponse.next({ request: peticion });

  const cliente = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => peticion.cookies.getAll(),
        setAll: (nuevas) => {
          for (const { name, value } of nuevas) peticion.cookies.set(name, value);
          respuesta = NextResponse.next({ request: peticion });
          for (const { name, value, options } of nuevas)
            respuesta.cookies.set(name, value, options);
        }
      }
    }
  );

  const {
    data: { user }
  } = await cliente.auth.getUser();

  if (!user && ruta.startsWith(PROTEGIDO)) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = "/entrar";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

/* Lo estático no pasa por aquí, y no es una micro-optimización: este
 * middleware llama a `auth.getUser()` en CADA petición que cruza el matcher, o
 * sea un viaje de red a Supabase. Con la marca servida desde `/marca`, cargar
 * la portada disparaba una comprobación de sesión por cada SVG y por el
 * favicon — trabajo de autenticación para archivos que son públicos por
 * definición y que nunca dependen de quién los pide.
 *
 * SE EXCLUYE POR EXTENSIÓN, NO POR CARPETA. La versión anterior excluía el
 * prefijo `marca/` para saltarse esos SVG, y con eso se llevó por delante las
 * páginas de marca —`/marca/dermanat` y las otras tres— que no son archivos
 * sino rutas. Mientras esto solo decidía sobre sesiones no se notó, porque esas
 * páginas son públicas de todas formas; en cuanto el middleware pasó a ser
 * también la puerta de «en construcción», la exclusión se volvió una fuga: la
 * tienda cerrada y las páginas de marca enseñando el catálogo entero.
 *
 * Un archivo tiene extensión y una ruta de la tienda no, así que el corte va
 * por ahí: `/marca/isotipo-azul-noche.svg` queda fuera y `/marca/dermanat`
 * dentro. `robots.txt`, `sitemap.xml` y `feed.xml` quedan fuera por la misma
 * regla, y está bien: cada uno comprueba la apertura por su cuenta. */
export const config = {
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"]
};
