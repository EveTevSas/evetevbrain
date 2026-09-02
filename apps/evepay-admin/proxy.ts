import type { NextRequest } from "next/server";
import { refreshSessionAndAuthorize } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return refreshSessionAndAuthorize(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|marca/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
