import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { castTokenVoteSchema, tokenVoteStateQuerySchema } from "@/lib/contracts";
import { castTokenVote, DemoApiError, getTokenVoteState } from "@/lib/demo/store";

// Única ruta del API que no exige sesión de Supabase: quien vota por enlace
// (specs/eve-conecta/voto-autoservicio-asamblea) no inicia sesión en el
// portal. La autorización la hace la propia RPC a partir del token, no esta
// ruta ni RLS por auth.uid().
export const dynamic = "force-dynamic";

function problem(message: string, status: number) {
  return NextResponse.json({ title: message }, { status });
}

function handlePublicError(error: unknown) {
  if (error instanceof DemoApiError) return problem(error.message, error.status);
  if (error instanceof ZodError) {
    return problem(error.issues[0]?.message ?? "Los datos enviados no son válidos.", 400);
  }
  console.error("EveConecta public API", error);
  return problem("No fue posible completar la operación.", 500);
}

export async function GET(request: NextRequest) {
  try {
    const { token } = tokenVoteStateQuerySchema.parse({
      token: request.nextUrl.searchParams.get("token")
    });
    return NextResponse.json(await getTokenVoteState(token));
  } catch (error) {
    return handlePublicError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const input = castTokenVoteSchema.parse(body);
    return NextResponse.json(await castTokenVote(input), { status: 201 });
  } catch (error) {
    return handlePublicError(error);
  }
}
