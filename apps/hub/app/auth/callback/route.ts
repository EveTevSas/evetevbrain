import { NextResponse, type NextRequest } from "next/server";
import { isSafeInternalPath } from "@/lib/auth/acceso";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Retorno de Google: cambia el código por sesión y vuelve a donde iba la persona. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const destino = isSafeInternalPath(next) ? next : "/";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/login?error=google`);
}
