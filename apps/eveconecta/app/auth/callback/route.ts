import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { isSafeInternalPath } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const requestedPath = request.nextUrl.searchParams.get("next");
  const next = isSafeInternalPath(requestedPath) ? requestedPath : "/";
  const supabase = await getSupabaseServerClient();

  const { error } =
    tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("Falta el código de autenticación.") };

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = error ? "/login" : next;
  redirectUrl.search = "";
  if (error) {
    redirectUrl.searchParams.set("error", "enlace_invalido");
  }

  return NextResponse.redirect(redirectUrl);
}
