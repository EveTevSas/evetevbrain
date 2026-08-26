"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { IconoError } from "@/components/iconos";

const inicial: LoginState = {};
const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

export default function LoginPage() {
  const [state, formAction, pendiente] = useActionState(login, inicial);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card w-full max-w-sm p-8">
        {/* Isotipo del CDN (T1) + nombre del producto en Baloo 2, centrado */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${CDN}/isotipos/isotipo-azul-noche.svg`} alt="Evetev" width={44} height={32} />
          <h1 className="brand text-2xl leading-none">EveLedger</h1>
          <p className="text-sm text-eve-pizarra">Operación diaria de tu estación · por Evetev</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="lbl">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="inp"
            />
          </div>
          <div>
            <label htmlFor="password" className="lbl">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="inp"
            />
          </div>
          {/* Errores: ícono + texto, nunca solo color (C5) */}
          {state.error && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-[9px] bg-eve-error/10 px-3 py-2 text-sm text-eve-error"
            >
              <IconoError className="h-4 w-4 shrink-0" />
              {state.error}
            </p>
          )}
          {/* Único botón coral de la vista (C2) */}
          <button type="submit" disabled={pendiente} className="btn btn-cta w-full">
            {pendiente ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
