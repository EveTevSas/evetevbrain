"use client";

import { Button, Card } from "@/lib/ui";
import { isSafeInternalPath } from "@/lib/auth/permissions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import mascotaEve from "../../../../packages/brand/assets/mascota/mascota.webp";
import { BrandMark } from "../../components/brand-mark";
import { Field, TextInput } from "../../components/form-field";

type BusyAction = "login" | "recovery" | null;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      setMessage({
        text: "No pudimos validar esas credenciales. Revisa los datos o recupera tu acceso.",
        tone: "error"
      });
      setBusy(null);
      return;
    }

    const requestedPath = new URLSearchParams(window.location.search).get("next");
    router.replace(isSafeInternalPath(requestedPath) ? requestedPath : "/");
    router.refresh();
  }

  async function recoverAccess() {
    if (!email.trim()) {
      setMessage({
        text: "Escribe primero el correo asociado a tu cuenta.",
        tone: "error"
      });
      return;
    }

    setBusy("recovery");
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/actualizar-contrasena`;
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });

    if (error) {
      setMessage({
        text: "No pudimos procesar la solicitud en este momento. Inténtalo nuevamente.",
        tone: "error"
      });
    } else {
      setMessage({
        text: "Si el correo está registrado, recibirás un enlace para crear una contraseña nueva.",
        tone: "info"
      });
    }
    setBusy(null);
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[var(--eve-azul-noche)] lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 -top-32 size-[32rem] rounded-full border border-white/10 bg-[var(--eve-electrico)]/15" />
        <div className="absolute bottom-20 left-1/3 size-72 rounded-full bg-[var(--eve-cian)]/10 blur-3xl" />
        <Image
          alt=""
          aria-hidden="true"
          className="absolute -bottom-8 right-2 w-52 opacity-25 xl:w-64"
          priority
          src={mascotaEve}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center">
            <BrandMark inverse priority size={42} />
          </span>
          <div>
            <p className="font-brand text-xl font-semibold tracking-[-0.02em]">EveConecta</p>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#B9CCE0]">
              Una vertical de Evetev
            </p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--eve-cian)]">
            Confianza operacional
          </p>
          <h1 className="mt-5 text-[clamp(2.5rem,5vw,4rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
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
            <span className="grid size-10 place-items-center">
              <BrandMark priority size={38} />
            </span>
            <div>
              <p className="font-brand text-lg font-semibold">EveConecta</p>
              <p className="text-xs text-[var(--muted)]">Una vertical de Evetev</p>
            </div>
          </div>
          <Card className="p-6 sm:p-8">
            <BadgeCheck />
            <h2 className="mt-5 text-[clamp(1.6rem,3vw,2rem)] font-semibold tracking-[-0.03em]">
              Bienvenida de nuevo
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Usa las credenciales de acceso enviadas por la administración.
            </p>
            <form className="mt-7 grid gap-5" onSubmit={submit}>
              <Field label="Correo electrónico">
                <TextInput
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </Field>
              <Field label="Contraseña">
                <span className="relative block">
                  <TextInput
                    autoComplete="current-password"
                    className="pr-11"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="focus-ring absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[var(--muted)]"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </Field>
              <div className="flex items-center justify-end text-sm">
                <button
                  className="font-bold text-[var(--accent)] disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => void recoverAccess()}
                  type="button"
                >
                  {busy === "recovery" ? "Enviando…" : "Recuperar acceso"}
                </button>
              </div>
              {message ? (
                <p
                  aria-live="polite"
                  className={
                    message.tone === "error"
                      ? "rounded-xl bg-[#FEF2F2] p-3 text-sm text-[var(--eve-error)]"
                      : "rounded-xl bg-[var(--accent-soft)] p-3 text-sm text-[var(--eve-mezclado)]"
                  }
                  role={message.tone === "error" ? "alert" : "status"}
                >
                  {message.text}
                </p>
              ) : null}
              <Button
                className="w-full"
                disabled={busy !== null}
                size="lg"
                type="submit"
                variant="cta"
              >
                {busy === "login" ? "Validando…" : "Entrar a EveConecta"}
                <ArrowRight size={17} />
              </Button>
            </form>
            <div className="mt-6 flex items-start gap-2 rounded-xl bg-[var(--wash)] p-3 text-xs leading-5 text-[var(--muted)]">
              <LockKeyhole className="mt-0.5 shrink-0 text-[var(--accent)]" size={15} />
              La sesión se valida con Supabase Auth y cada perfil accede únicamente a la información
              autorizada para su copropiedad.
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function BadgeCheck() {
  return (
    <span className="grid size-11 place-items-center rounded-[var(--eve-radio-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
      <LockKeyhole size={20} />
    </span>
  );
}

function LoginTrust({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-white/75">
      <span className="grid size-9 place-items-center rounded-[var(--eve-radio-md)] bg-white/10 text-[var(--eve-cian)]">
        <Icon size={17} />
      </span>
      {text}
    </div>
  );
}
