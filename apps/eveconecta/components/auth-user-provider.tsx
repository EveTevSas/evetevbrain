"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthenticatedUserView } from "@/lib/auth/permissions";

interface AuthUserContextValue {
  availableConjuntos: Array<{ id: string; name: string }>;
  conjuntoId: string;
  conjuntoName: string;
  user: AuthenticatedUserView;
}

const AuthUserContext = createContext<AuthUserContextValue | null>(null);

export function AuthUserProvider({
  availableConjuntos,
  children,
  conjuntoId,
  conjuntoName,
  user
}: AuthUserContextValue & { children: ReactNode }) {
  return (
    <AuthUserContext.Provider value={{ availableConjuntos, conjuntoId, conjuntoName, user }}>
      {children}
    </AuthUserContext.Provider>
  );
}

export function useAuthUser(): AuthUserContextValue {
  const context = useContext(AuthUserContext);
  if (!context) {
    throw new Error("useAuthUser debe usarse dentro de AuthUserProvider");
  }
  return context;
}
