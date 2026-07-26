/**
 * Función serverless que recibe los formularios del sitio y los envía por
 * correo a la empresa. Cubre los dos: el de contacto (index.html) y el de
 * postulación (nosotros.html).
 *
 * Decisiones y por qué:
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

const LIMITES = { nombre: 120, correo: 160, texto: 4000, campo: 240 };

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

function construirMensaje(datos) {
  const esPostulacion = datos.tipo === "postulacion";
  const asunto = esPostulacion
    ? `Postulación: ${datos.nombre}${datos.area ? ` — ${datos.area}` : ""}`
    : `Contacto: ${datos.nombre}${datos.empresa ? ` — ${datos.empresa}` : ""}`;

  const filas = [
    ["Nombre", datos.nombre],
    ["Correo", datos.correo],
    esPostulacion ? ["Área", datos.area] : ["Tamaño de empresa", datos.empresa],
    esPostulacion ? ["Enlace", datos.enlace] : ["Le interesa", datos.interes],
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  const datos = {
    tipo: cuerpo.tipo === "postulacion" ? "postulacion" : "contacto",
    nombre: limpiar(cuerpo.nombre, LIMITES.nombre),
    correo: limpiar(cuerpo.correo, LIMITES.correo),
    empresa: limpiar(cuerpo.empresa, LIMITES.campo),
    interes: limpiar(cuerpo.interes, LIMITES.campo),
    area: limpiar(cuerpo.area, LIMITES.campo),
    enlace: limpiar(cuerpo.enlace, LIMITES.campo),
    mensaje: limpiar(cuerpo.mensaje, LIMITES.texto),
    origen: limpiar(cuerpo.origen, LIMITES.campo)
  };

  if (!datos.nombre) return res.status(400).json({ ok: false, error: "falta_nombre" });
  if (!correoPlausible(datos.correo)) {
    return res.status(400).json({ ok: false, error: "correo_invalido" });
  }

  try {
    await enviarCorreo({ ...construirMensaje(datos), responderA: datos.correo });
    console.log(`formulario enviado (${datos.tipo})`); // sin PII (§4)
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(`formulario falló (${datos.tipo}):`, e.message, e.detalle || "");
    return res
      .status(e.codigo || 500)
      .json({ ok: false, error: e.message === "sin_proveedor" ? "sin_proveedor" : "envio_fallido" });
  }
};
