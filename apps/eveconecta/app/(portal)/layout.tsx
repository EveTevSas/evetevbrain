import type { ReactNode } from "react";
import { requireCurrentAccess } from "@/lib/auth/access";
import { AppShell } from "../../components/app-shell";
import { AuthUserProvider } from "../../components/auth-user-provider";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const access = await requireCurrentAccess();

  return (
    <AuthUserProvider
      availableConjuntos={access.availableConjuntos}
      conjuntoId={access.conjuntoId}
      conjuntoName={access.conjuntoName}
      user={access.user}
    >
      <AppShell>{children}</AppShell>
    </AuthUserProvider>
  );
}
