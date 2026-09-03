import { describe, expect, it } from "vitest";
import { PerfilComercioSchema } from "./perfil-comercio.schema";

/** Perfil válido mínimo; cada test cambia solo lo que quiere probar. */
function perfil(cambios: Record<string, unknown> = {}) {
  return {
    tipoPersona: "juridica",
    tipoDocumento: "NIT",
    numeroDocumento: "830053105",
    digitoVerificacion: "3",
    direccion: "Calle 72 # 10-34",
    ciudad: "Bogotá",
    departamento: "Cundinamarca",
    correoNotificaciones: "sistemas@comercio.com",
    correoFacturacion: "contabilidad@comercio.com",
    repNombre: "Ana Gómez",
    repTipoDocumento: "CC",
    repNumeroDocumento: "1020304050",
    contactoNombre: "Luis Pérez",
    contactoCorreo: "luis@comercio.com",
    beneficiarios: [
      { nombre: "Ana Gómez", tipoDocumento: "CC", numeroDocumento: "1020304050", participacion: 60 }
    ],
    ...cambios
  };
}

describe("PerfilComercioSchema — identificación", () => {
  it("acepta un perfil completo y válido", () => {
    expect(PerfilComercioSchema.safeParse(perfil()).success).toBe(true);
  });

  /* El caso que esto existe para atrapar: un dígito mal tecleado en el NIT.
     No rebota en ningún lado hasta que el banco rechaza la dispersión. */
  it("rechaza un dígito de verificación que no corresponde al NIT", () => {
    const r = PerfilComercioSchema.safeParse(perfil({ digitoVerificacion: "7" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toContain("no corresponde al NIT");
    }
  });

  it("acepta el NIT escrito con puntos, como viene del RUT", () => {
    expect(PerfilComercioSchema.safeParse(perfil({ numeroDocumento: "830.053.105" })).success).toBe(
      true
    );
  });

  it("un documento con letras se rechaza", () => {
    expect(PerfilComercioSchema.safeParse(perfil({ numeroDocumento: "830O53105" })).success).toBe(
      false
    );
  });

  it("una cédula sin dígito de verificación pasa: no lleva", () => {
    const r = PerfilComercioSchema.safeParse(
      perfil({
        tipoPersona: "natural",
        tipoDocumento: "CC",
        numeroDocumento: "1020304050",
        digitoVerificacion: "",
        beneficiarios: []
      })
    );
    expect(r.success).toBe(true);
  });
});

describe("PerfilComercioSchema — beneficiario final", () => {
  /* Una empresa siempre tiene a alguien detrás. Si no se declaró, o no se
     preguntó o se está ocultando, y las dos cosas dejan el expediente cojo. */
  it("una persona jurídica sin beneficiarios se rechaza", () => {
    const r = PerfilComercioSchema.safeParse(perfil({ beneficiarios: [] }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toContain("beneficiario final");
    }
  });

  it("una persona natural no necesita declararlos: es ella misma", () => {
    const r = PerfilComercioSchema.safeParse(
      perfil({
        tipoPersona: "natural",
        tipoDocumento: "CC",
        numeroDocumento: "1020304050",
        digitoVerificacion: "",
        beneficiarios: []
      })
    );
    expect(r.success).toBe(true);
  });

  it("admite varios beneficiarios con su participación y su condición de PEP", () => {
    const r = PerfilComercioSchema.safeParse(
      perfil({
        beneficiarios: [
          {
            nombre: "Ana Gómez",
            tipoDocumento: "CC",
            numeroDocumento: "1020304050",
            participacion: 55
          },
          {
            nombre: "Jorge Ruiz",
            tipoDocumento: "CC",
            numeroDocumento: "9988776655",
            participacion: 45,
            esPep: true
          }
        ]
      })
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.beneficiarios[1]?.esPep).toBe(true);
      // Por omisión nadie es PEP; hay que declararlo.
      expect(r.data.beneficiarios[0]?.esPep).toBe(false);
    }
  });
});

describe("PerfilComercioSchema — cuenta de dispersión", () => {
  const cuenta = {
    banco: "Bancolombia",
    tipoCuenta: "ahorros",
    numeroCuenta: "12345678901"
  };

  it("sin datos bancarios el perfil es válido: se completan después", () => {
    expect(PerfilComercioSchema.safeParse(perfil()).success).toBe(true);
  });

  it("los tres datos juntos son válidos", () => {
    expect(PerfilComercioSchema.safeParse(perfil(cuenta)).success).toBe(true);
  });

  /* Media cuenta no sirve para transferir y da la falsa impresión de que ya
     se puede dispersar. */
  it("una cuenta a medias se rechaza", () => {
    const r = PerfilComercioSchema.safeParse(perfil({ banco: "Bancolombia" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toContain("o los tres o ninguno");
    }
  });

  /* Dispersar a la cuenta de un tercero es exactamente lo que la norma
     persigue; comparar documentos es la única forma de verlo desde aquí. */
  it("rechaza una cuenta cuyo titular no es el comercio", () => {
    const r = PerfilComercioSchema.safeParse(
      perfil({ ...cuenta, titularCuenta: "Otra Empresa SAS", titularDocumento: "900123456" })
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(JSON.stringify(r.error.issues)).toContain("cuentas de terceros");
    }
  });

  it("acepta el titular correcto aunque venga con puntos", () => {
    const r = PerfilComercioSchema.safeParse(
      perfil({ ...cuenta, titularCuenta: "Comercio SAS", titularDocumento: "830.053.105" })
    );
    expect(r.success).toBe(true);
  });
});

describe("PerfilComercioSchema — correos", () => {
  it("exige el operativo y el de facturación por separado", () => {
    expect(
      PerfilComercioSchema.safeParse(perfil({ correoNotificaciones: undefined })).success
    ).toBe(false);
    expect(PerfilComercioSchema.safeParse(perfil({ correoFacturacion: undefined })).success).toBe(
      false
    );
  });

  it("un correo mal formado se rechaza", () => {
    expect(
      PerfilComercioSchema.safeParse(perfil({ correoNotificaciones: "sistemas@" })).success
    ).toBe(false);
  });

  it("la persona de contacto es obligatoria y aparte del representante legal", () => {
    expect(PerfilComercioSchema.safeParse(perfil({ contactoNombre: undefined })).success).toBe(
      false
    );
    expect(PerfilComercioSchema.safeParse(perfil({ contactoCorreo: undefined })).success).toBe(
      false
    );
  });
});

/* Lo que la API entrega tiene que poder volver a entrar. La base devuelve null
   en cada campo opcional sin llenar, y el esquema los rechazaba: leer un perfil
   y guardarlo tal cual fallaba con "Invalid input" en cada uno. Se descubrió
   probando el editar del CRUD contra un perfil real. */
describe("PerfilComercioSchema — un perfil leído se puede volver a guardar", () => {
  it("acepta null en los campos opcionales, que es como los devuelve la base", () => {
    const comoVieneDeLaBase = {
      ...perfil(),
      nombreComercial: null,
      ciiu: null,
      telefono: null,
      sitioWeb: null,
      direccionFacturacion: null,
      repCorreo: null,
      repTelefono: null,
      contactoCargo: null,
      contactoTelefono: null,
      banco: null,
      tipoCuenta: null,
      numeroCuenta: null,
      titularCuenta: null,
      titularDocumento: null,
      digitoVerificacion: null,
      numeroDocumento: "1020304050",
      tipoDocumento: "CC"
    };

    const r = PerfilComercioSchema.safeParse(comoVieneDeLaBase);
    expect(r.success).toBe(true);
    if (r.success) {
      // Los null se normalizan a vacío, no se propagan.
      expect(r.data.telefono).toBe("");
      expect(r.data.tipoCuenta).toBeUndefined();
    }
  });

  it("un beneficiario sin participación declarada también vuelve a entrar", () => {
    const r = PerfilComercioSchema.safeParse(
      perfil({
        beneficiarios: [
          {
            nombre: "Ana Gómez",
            tipoDocumento: "CC",
            numeroDocumento: "1020304050",
            participacion: null,
            esPep: false
          }
        ]
      })
    );
    expect(r.success).toBe(true);
  });
});
