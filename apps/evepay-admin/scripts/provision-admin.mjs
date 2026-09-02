/**
 * Aprovisiona un usuario super_admin de la consola de EvePay (A5 de
 * specs/evepay/admin-console/). Se corre desde un entorno administrativo
 * seguro con la clave secreta del proyecto Supabase de EVEPAY:
 *
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... SUPABASE_INVITE_REDIRECT_URL=... \
 *     pnpm auth:provision-admin --email persona@evetev.com --name "Nombre"
 *
 * El rol va en app_metadata (solo escribible con la clave secreta; el usuario
 * no puede editarlo). Si el usuario ya existe, solo se asegura el rol.
 */
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function argumentsFrom(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Falta el valor de ${token}.`);
    }
    result.set(token.slice(2), value);
    index += 1;
  }
  return result;
}

function required(value, label) {
  if (!value?.trim()) throw new Error(`Falta ${label}.`);
  return value.trim();
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user || data.users.length < 1000) return user;
  }
  throw new Error("La búsqueda superó 10.000 usuarios; usa el panel de Supabase.");
}

async function main() {
  const args = argumentsFrom(process.argv.slice(2));
  const url = required(process.env.SUPABASE_URL, "SUPABASE_URL");
  const secretKey = required(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY");
  const redirectTo = required(
    process.env.SUPABASE_INVITE_REDIRECT_URL,
    "SUPABASE_INVITE_REDIRECT_URL"
  );
  const email = required(args.get("email"), "--email").toLowerCase();
  const name = required(args.get("name"), "--name");

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  });

  const existing = await findUserByEmail(supabase, email);

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      app_metadata: { ...existing.app_metadata, role: "super_admin" }
    });
    if (error) throw error;
    console.log(`Listo: ${email} ya existía; rol super_admin asegurado.`);
    return;
  }

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { name }
  });
  if (error) throw error;

  const created = await findUserByEmail(supabase, email);
  if (!created) throw new Error("El usuario invitado no aparece en el listado.");

  const { error: roleError } = await supabase.auth.admin.updateUserById(created.id, {
    app_metadata: { ...created.app_metadata, role: "super_admin" }
  });
  if (roleError) throw roleError;

  console.log(`Listo: invitación enviada a ${email} con rol super_admin.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
