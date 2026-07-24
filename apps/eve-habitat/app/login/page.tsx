"use client";

import { Button, Card } from "@/lib/ui";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field, TextInput } from "../../components/form-field";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    window.localStorage.setItem("eve-habitat:demo-session", "active");
    window.setTimeout(() => router.push("/"), 350);
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[var(--ink)] lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 size-[32rem] rounded-full border border-white/10 bg-teal-400/10" />
        <div className="absolute bottom-20 left-1/3 size-72 rounded-full bg-orange-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-teal-500 text-white">
            <Building2 size={22} />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-[-0.03em]">Eve-Habitat</p>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/55">
              por Evetev
            </p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-teal-300">
            Confianza operacional
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-[-0.05em] xl:text-6xl">
            Tu comunidad,
            <br />
            clara y conectada.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">
            Dinero conciliado, decisiones reproducibles y servicios que siguen funcionando cuando la
            red no lo hace.
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <LoginTrust icon={ShieldCheck} text="Aislamiento por copropiedad" />
            <LoginTrust icon={CheckCircle2} text="Auditoría que no se borra" />
          </div>
        </div>
        <p className="relative text-xs text-white/35">
          © 2026 Evetev · Tecnología responsable para comunidades
        </p>
      </section>

      <section className="grid place-items-center bg-[var(--canvas)] px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--accent)] text-white">
              <Building2 size={20} />
            </span>
            <div>
              <p className="font-extrabold">Eve-Habitat</p>
              <p className="text-xs text-[var(--muted)]">por Evetev</p>
            </div>
          </div>
          <Card className="p-6 sm:p-8">
            <BadgeCheck />
            <h2 className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">Bienvenida de nuevo</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Ingresa a la operación de Bosques de Arrayán.
            </p>
            <form className="mt-7 grid gap-5" onSubmit={submit}>
              <Field label="Correo electrónico">
                <TextInput
                  type="email"
                  autoComplete="email"
                  defaultValue="administracion@bosques.test"
                  required
                />
              </Field>
              <Field label="Contraseña">
                <span className="relative block">
                  <TextInput
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    defaultValue="EveHabitat2026!"
                    className="pr-11"
                    required
                  />
                  <button
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="focus-ring absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--muted)]"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </Field>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 font-semibold text-[var(--muted)]">
                  <input className="size-4 accent-[var(--accent)]" type="checkbox" defaultChecked />{" "}
                  Recordarme
                </label>
                <button className="font-bold text-[var(--accent)]" type="button">
                  Recuperar acceso
                </button>
              </div>
              <Button className="w-full" size="lg" type="submit" disabled={busy}>
                {busy ? "Validando…" : "Entrar al entorno demo"}
                <ArrowRight size={17} />
              </Button>
            </form>
            <div className="mt-6 flex items-start gap-2 rounded-xl bg-[var(--wash)] p-3 text-xs leading-5 text-[var(--muted)]">
              <LockKeyhole className="mt-0.5 shrink-0 text-[var(--accent)]" size={15} />
              Este acceso local no envía credenciales. Producción usa Supabase Auth con sesión
              reforzada.
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function BadgeCheck() {
  return (
    <span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
      <LockKeyhole size={20} />
    </span>
  );
}
function LoginTrust({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-white/75">
      <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-teal-300">
        <Icon size={17} />
      </span>
      {text}
    </div>
  );
}
