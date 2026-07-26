"use client";

import { Button, Card } from "@/lib/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandMark } from "../../components/brand-mark";
import { Field, TextInput } from "../../components/form-field";

function isStrongPassword(value: string): boolean {
  return (
    value.length >= 12 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isStrongPassword(password)) {
      setError("Usa al menos 12 caracteres e incluye mayúscula, minúscula, número y símbolo.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) {
      setError("No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <BrandMark priority size={40} />
          <span className="font-brand text-xl font-semibold">EveConecta</span>
        </div>
        <Card className="p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-[var(--eve-radio-md)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <KeyRound size={20} />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Crea tu contraseña</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Este paso completa una invitación nueva o recupera el acceso a una cuenta existente.
          </p>
          <form className="mt-7 grid gap-5" onSubmit={submit}>
            <Field label="Contraseña nueva">
              <span className="relative block">
                <TextInput
                  autoComplete="new-password"
                  className="pr-11"
                  minLength={12}
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
            <Field label="Confirma la contraseña">
              <TextInput
                autoComplete="new-password"
                minLength={12}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={confirmation}
              />
            </Field>
            <p className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
              <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--eve-exito)]" size={15} />
              Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
            </p>
            {error ? (
              <p
                aria-live="polite"
                className="rounded-xl bg-[#FEF2F2] p-3 text-sm text-[var(--eve-error)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <Button className="w-full" disabled={busy} size="lg" type="submit" variant="cta">
              {busy ? "Guardando…" : "Guardar y continuar"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
