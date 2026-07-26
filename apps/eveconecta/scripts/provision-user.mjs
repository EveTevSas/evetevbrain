import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const roles = new Set(["super_admin", "admin_conjunto", "consejo", "residente"]);

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
  const role = required(args.get("role"), "--role");
  const conjuntoId = required(args.get("conjunto-id"), "--conjunto-id");
  const unidadId = args.get("unidad-id")?.trim();

  if (!roles.has(role)) {
    throw new Error("--role debe ser super_admin, admin_conjunto, consejo o residente.");
  }
  if (role === "residente" && !unidadId) {
    throw new Error("Los residentes requieren --unidad-id para limitar sus datos a una unidad.");
  }

  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });

  const { data: conjunto, error: conjuntoError } = await supabase
    .schema("conjuntos")
    .from("conjuntos")
    .select("id, nombre")
    .eq("id", conjuntoId)
    .eq("activo", true)
    .maybeSingle();
  if (conjuntoError) throw conjuntoError;
  if (!conjunto) throw new Error("La copropiedad indicada no existe o está inactiva.");

  if (role === "residente") {
    const { data: unidad, error: unidadError } = await supabase
      .schema("conjuntos")
      .from("unidades")
      .select("id")
      .eq("id", unidadId)
      .eq("conjunto_id", conjuntoId)
      .eq("activa", true)
      .maybeSingle();
    if (unidadError) throw unidadError;
    if (!unidad)
      throw new Error("La unidad indicada no pertenece a la copropiedad o está inactiva.");
  }

  let user = await findUserByEmail(supabase, email);
  let invited = false;
  if (!user) {
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: name },
      redirectTo
    });
    if (error) throw error;
    user = data.user;
    invited = true;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, full_name: name }
    });
    if (error) throw error;
  }

  const { error: membershipError } = await supabase
    .schema("conjuntos")
    .from("miembros_conjunto")
    .upsert(
      {
        activo: true,
        conjunto_id: conjuntoId,
        rol: role,
        usuario_id: user.id
      },
      { onConflict: "conjunto_id,usuario_id" }
    );
  if (membershipError) throw membershipError;

  if (role === "residente") {
    const { data: existingPerson, error: personLookupError } = await supabase
      .schema("conjuntos")
      .from("personas")
      .select("id")
      .eq("conjunto_id", conjuntoId)
      .eq("auth_usuario_id", user.id)
      .maybeSingle();
    if (personLookupError) throw personLookupError;

    let personId = existingPerson?.id;
    if (personId) {
      const { error } = await supabase
        .schema("conjuntos")
        .from("personas")
        .update({ email, nombre: name })
        .eq("id", personId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .schema("conjuntos")
        .from("personas")
        .insert({
          auth_usuario_id: user.id,
          conjunto_id: conjuntoId,
          email,
          nombre: name
        })
        .select("id")
        .single();
      if (error) throw error;
      personId = data.id;
    }

    const { data: existingLink, error: linkLookupError } = await supabase
      .schema("conjuntos")
      .from("personas_unidades")
      .select("id")
      .eq("conjunto_id", conjuntoId)
      .eq("persona_id", personId)
      .eq("unidad_id", unidadId)
      .eq("relacion", "residente")
      .is("vigente_hasta", null)
      .maybeSingle();
    if (linkLookupError) throw linkLookupError;

    if (!existingLink) {
      const { error } = await supabase.schema("conjuntos").from("personas_unidades").insert({
        conjunto_id: conjuntoId,
        persona_id: personId,
        relacion: "residente",
        unidad_id: unidadId
      });
      if (error) throw error;
    }
  }

  const { error: auditError } = await supabase
    .schema("conjuntos")
    .from("eventos_auditoria")
    .insert({
      accion: invited ? "auth.usuario_invitado" : "auth.usuario_actualizado",
      conjunto_id: conjuntoId,
      datos: { rol: role },
      recurso_id: user.id,
      recurso_tipo: "usuario"
    });
  if (auditError) throw auditError;

  console.log(
    invited
      ? `Invitación enviada y perfil ${role} asignado en ${conjunto.nombre}.`
      : `Perfil ${role} actualizado en ${conjunto.nombre}; la cuenta ya existía.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "No fue posible aprovisionar el usuario.");
  process.exitCode = 1;
});
