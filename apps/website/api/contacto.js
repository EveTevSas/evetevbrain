/**
 * Función serverless que recibe los formularios de TODA la marca y los envía
 * por correo a la empresa. Cubre cuatro: contacto (index.html), postulación
 * (nosotros.html) y las dos demos de las landings de producto —EvePay y
 * EveConecta—, que viven en otros dominios y llegan aquí por CORS.
 *
 * Decisiones y por qué:
 * - **Una sola función para las cuatro.** Las landings son proyectos de Vercel
 *   aparte, así que duplicar la función ahí obligaría a repetir la clave del
 *   proveedor en cada proyecto: tres sitios donde rotarla y tres donde
 *   olvidarla. Con un único endpoint la credencial vive en un solo lugar y las
 *   landings siguen siendo estáticas, sin variables de entorno.
 * - **El correo dice de qué producto viene.** `producto` entra por una lista
 *   blanca y decide el prefijo del asunto; el cliente no escribe el rótulo.
 * - **Sin dependencias.** Se llama a la API del proveedor con `fetch` nativo
 *   (Node 18+). El paquete `@evetev/website` no tiene node_modules ni build, y
 *   meterle uno solo por esto no se justifica (§1, no sobre-ingeniar).
 * - **El proveedor está aislado en `enviarCorreo`.** La constitución deja el
 *   proveedor de email transaccional como decisión abierta (§7); cambiarlo es
 *   tocar una sola función, no el resto del archivo.
 * - **Sin PII en logs (§4).** No se registra el cuerpo del formulario: solo el
 *   tipo de envío y el resultado.
 * - **Sin secretos en el repo (§4).** La API key vive en las variables de
 *   entorno de Vercel.
 */

const DESTINO = process.env.CONTACTO_DESTINO || "contacto@evetev.com";
/* Remitente en un SUBDOMINIO, no en el dominio raíz, y esto es a propósito:
   evetev.com recibe su correo en Google Workspace (MX → smtp.google.com).
   Verificar el dominio raíz ante el proveedor de envío obliga a añadir un MX
   suyo para los rebotes, que chocaría con el de Google y podría dejar la
   empresa sin recibir correo. Con un subdominio dedicado no se toca nada del
   correo existente. */
const REMITENTE = process.env.CONTACTO_REMITENTE || "Web Evetev <web@send.evetev.com>";

/* Quién puede llamar desde el navegador. Desde que las landings de producto
   son rutas de este mismo sitio (/conecta, /evepay, /intelligence) el envío ya
   no es cross-origin y no necesita CORS; los subdominios siguen aquí mientras
   estén redirigiendo, y las previews sí lo necesitan.

   Ojo con lo que esta lista SÍ y NO hace: impide que una página ajena use el
   endpoint desde el navegador de un visitante, no que alguien lo llame con
   curl. Contra eso está la trampa antibots, no el CORS. */
const ORIGENES = new Set([
  "https://evetev.com",
  "https://www.evetev.com",
  /* Antiguos subdominios de las landings. Se conservan mientras redirigen a
     evetev.com; se pueden borrar cuando los dominios se retiren del panel. */
  "https://evepay.evetev.com",
  "https://eveconecta.evetev.com",
  "https://eveintelligence.evetev.com"
]);
/* Previews de Vercel del sitio —landings incluidas, que ahora son rutas suyas—
   para poder probar el formulario en el despliegue de un PR. El correo que
   llega lleva el host y la ruta reales en «Enviado desde», así que una prueba
   nunca se confunde con un cliente. */
const ORIGEN_PREVIEW = /^https:\/\/website-[a-z0-9-]+\.vercel\.app$/;
/* Desarrollo local: `pnpm dev` sirve el sitio entero en localhost. */
const ORIGEN_LOCAL = /^http:\/\/localhost:\d{2,5}$/;

/** Rótulo del producto. Lista blanca a propósito: el asunto del correo no lo
 *  escribe el cliente, solo elige entre estas dos claves. */
const PRODUCTOS = {
  evepay: "EvePay",
  eveconecta: "EveConecta",
  eveintelligence: "Eve Intelligence"
};

const LIMITES = { nombre: 120, correo: 160, texto: 4000, campo: 240 };

function origenPermitido(origen) {
  if (!origen) return false;
  return ORIGENES.has(origen) || ORIGEN_PREVIEW.test(origen) || ORIGEN_LOCAL.test(origen);
}

/** Cabeceras de CORS. `Vary` para que ningún caché sirva la respuesta de un
 *  origen a otro distinto. */
function aplicarCors(req, res) {
  res.setHeader("Vary", "Origin");
  const origen = req.headers.origin;
  if (!origenPermitido(origen)) return;
  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function limpiar(valor, max) {
  if (typeof valor !== "string") return "";
  return valor.trim().slice(0, max);
}

/** Validación deliberadamente laxa: rechazar un correo válido es peor que
 *  aceptar uno raro, porque el costo es perder un cliente. */
function correoPlausible(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

function escapar(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Los campos propios de cada formulario: `[rótulo, clave del cuerpo]`, en el
 * orden en que se leen en el correo.
 *
 * Esta tabla es la ÚNICA lista blanca: lo que está aquí se limpia y se imprime;
 * lo que no está, ni una cosa ni la otra. Antes eran dos listas separadas —una
 * para limpiar el cuerpo y otra para pintarlo—, y un campo podía estar en una y
 * faltar en la otra sin que nada fallara: así se perdió el teléfono la primera
 * vez que una landing lo pidió. El formulario lo pedía obligatorio, la persona
 * lo tecleaba, y el correo llegaba sin él. Con una sola tabla ese fallo no se
 * puede volver a escribir.
 *
 * Las demos se reparten por producto porque preguntan cosas distintas: a un
 * comercio se le pregunta cuánto vende, a un conjunto cuántas unidades tiene.
 */
const CAMPOS = {
  contacto: [
    ["Tamaño de empresa", "empresa"],
    ["Le interesa", "interes"]
  ],
  postulacion: [
    ["Área", "area"],
    ["Enlace", "enlace"]
  ],
  "demo:evepay": [
    ["Empresa", "empresa"],
    ["Teléfono", "telefono"],
    ["Ventas mensuales", "volumen"],
    ["Cómo cobra hoy", "cobro"],
    ["Cuándo quiere empezar", "plazo"]
  ],
  "demo:eveintelligence": [
    ["Empresa", "empresa"],
    ["Teléfono", "telefono"],
    ["Para quién sería", "uso"],
    ["Documentación que tiene", "documentos"],
    ["Cuándo quiere empezar", "plazo"]
  ],
  "demo:eveconecta": [
    ["Conjunto", "conjunto"],
    ["Teléfono", "telefono"],
    ["Rol", "rol"],
    ["Unidades del conjunto", "unidades"],
    ["Ciudad", "ciudad"],
    ["Cuándo quiere empezar", "plazo"]
  ]
};

/** Una demo sin producto reconocido cae a la lista del contacto normal: se
 *  prefiere un correo escueto a uno que invente campos. */
function camposDe(tipo, producto) {
  return CAMPOS[producto ? `${tipo}:${producto}` : tipo] || CAMPOS[tipo] || CAMPOS.contacto;
}

function construirMensaje(datos) {
  const marca = PRODUCTOS[datos.producto];
  // El producto va DELANTE del asunto: en la bandeja se ve sin abrir el correo
  // y sin depender de que alguien lea la firma del final.
  const prefijo = marca ? `${marca} · ` : "";
  // En una demo, quién escribe importa menos que de dónde: «Demo: Ana Ruiz» no
  // dice nada en la bandeja, «Demo: Ana Ruiz — Café del Parque» sí.
  const organizacion = datos.empresa || datos.conjunto || "";
  const encabezado =
    datos.tipo === "postulacion"
      ? `Postulación: ${datos.nombre}${datos.area ? ` — ${datos.area}` : ""}`
      : datos.tipo === "demo"
        ? `Demo: ${datos.nombre}${organizacion ? ` — ${organizacion}` : ""}`
        : `Contacto: ${datos.nombre}${datos.empresa ? ` — ${datos.empresa}` : ""}`;
  const asunto = prefijo + encabezado;

  const propios = camposDe(datos.tipo, datos.producto).map(([rotulo, clave]) => [
    rotulo,
    datos[clave]
  ]);

  const filas = [
    ["Producto", marca],
    ["Nombre", datos.nombre],
    ["Correo", datos.correo],
    ...propios,
    ["Mensaje", datos.mensaje],
    ["Enviado desde", datos.origen]
  ].filter(([, v]) => v);

  const texto = filas.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;color:#0A2540;line-height:1.6">` +
    filas
      .map(
        ([k, v]) =>
          `<p style="margin:0 0 10px"><strong>${escapar(k)}:</strong><br>${escapar(v).replace(/\n/g, "<br>")}</p>`
      )
      .join("") +
    `</div>`;

  return { asunto, texto, html };
}

/** Único punto que conoce al proveedor. Hoy Resend; cambiarlo es tocar esto. */
async function enviarCorreo({ asunto, texto, html, responderA }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const e = new Error("sin_proveedor");
    e.codigo = 503;
    throw e;
  }

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: REMITENTE,
      to: [DESTINO],
      subject: asunto,
      text: texto,
      html,
      // Así se responde directo a la persona desde la bandeja de la empresa.
      reply_to: responderA
    })
  });

  if (!r.ok) {
    const detalle = await r.text().catch(() => "");
    const e = new Error(`proveedor_${r.status}`);
    e.codigo = 502;
    e.detalle = detalle.slice(0, 300);
    throw e;
  }
}

// CommonJS a propósito: el paquete no declara "type": "module", y así el
// archivo funciona sin depender de cómo se resuelva el sistema de módulos.
module.exports = async function handler(req, res) {
  aplicarCors(req, res);

  // El navegador pregunta antes de mandar JSON desde otro dominio. Si el
  // origen no está en la lista, la respuesta sale sin las cabeceras de CORS y
  // es el propio navegador el que corta.
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, error: "metodo_no_permitido" });
  }

  let cuerpo = req.body;
  if (typeof cuerpo === "string") {
    try {
      cuerpo = JSON.parse(cuerpo);
    } catch {
      return res.status(400).json({ ok: false, error: "json_invalido" });
    }
  }
  if (!cuerpo || typeof cuerpo !== "object") {
    return res.status(400).json({ ok: false, error: "cuerpo_vacio" });
  }

  // Trampa antibots: campo oculto que una persona nunca llena. Se responde 200
  // a propósito, para no darle al bot la señal de que fue detectado.
  if (limpiar(cuerpo.sitio, LIMITES.campo)) {
    return res.status(200).json({ ok: true });
  }

  const tipo = ["postulacion", "demo"].includes(cuerpo.tipo) ? cuerpo.tipo : "contacto";

  // Fuera de la lista blanca no hay producto: el correo sale sin rótulo antes
  // que con uno inventado por quien llamó.
  const producto = PRODUCTOS[cuerpo.producto] ? cuerpo.producto : "";

  const datos = {
    tipo,
    producto,
    nombre: limpiar(cuerpo.nombre, LIMITES.nombre),
    correo: limpiar(cuerpo.correo, LIMITES.correo),
    mensaje: limpiar(cuerpo.mensaje, LIMITES.texto),
    origen: limpiar(cuerpo.origen, LIMITES.campo)
  };
  // Los campos propios del formulario, tomados de la misma tabla que decide qué
  // se imprime. Un campo que la landing mande de más se ignora aquí.
  for (const [, clave] of camposDe(tipo, producto)) {
    datos[clave] = limpiar(cuerpo[clave], LIMITES.campo);
  }

  if (!datos.nombre) return res.status(400).json({ ok: false, error: "falta_nombre" });
  if (!correoPlausible(datos.correo)) {
    return res.status(400).json({ ok: false, error: "correo_invalido" });
  }

  try {
    await enviarCorreo({ ...construirMensaje(datos), responderA: datos.correo });
    // sin PII (§4): solo el tipo y el producto, nunca lo que escribió la persona
    console.log(`formulario enviado (${datos.tipo}${datos.producto ? `/${datos.producto}` : ""})`);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(
      `formulario falló (${datos.tipo}${datos.producto ? `/${datos.producto}` : ""}):`,
      e.message,
      e.detalle || ""
    );
    return res.status(e.codigo || 500).json({
      ok: false,
      error: e.message === "sin_proveedor" ? "sin_proveedor" : "envio_fallido"
    });
  }
};
