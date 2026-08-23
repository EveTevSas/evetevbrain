import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  const ruta = peticion.nextUrl.pathname;
  if (!user && ruta.startsWith(PROTEGIDO)) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = "/entrar";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
