/* Envío de los formularios del sitio. Compartido por index.html (contacto) y
   nosotros.html (postulación); ambos llegan a la misma función serverless.

   Regla que guía el manejo de errores: si el envío falla, la persona nunca se
   queda sin salida. Siempre se le ofrece el correo directo de la empresa, que
   funciona aunque el backend no. */

const CORREO_EMPRESA = "contacto@evetev.com";

async function enviarAlServidor(datos, boton, alTerminar) {
  // Candado de reentrada. Deshabilitar el botón no basta: un Enter en un campo
  // o un segundo disparo por código vuelve a entrar y manda el correo dos
  // veces. Y el rótulo original se guarda UNA sola vez, porque al reentrar se
  // guardaría "Enviando…" y el botón quedaría con ese texto para siempre.
  if (boton) {
    if (boton.dataset.enviando === "1") return;
    boton.dataset.enviando = "1";
    if (!boton.dataset.textoOriginal) boton.dataset.textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Enviando…";
  }

  let resultado;
  try {
    const r = await fetch("/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
    let cuerpo = {};
    try {
      cuerpo = await r.json();
    } catch {
      /* respuesta sin JSON: se trata como fallo genérico */
    }
    resultado = r.ok && cuerpo.ok ? { ok: true } : { ok: false, error: cuerpo.error || "envio_fallido" };
  } catch {
    resultado = { ok: false, error: "sin_red" };
  }

  if (boton) {
    boton.disabled = false;
    boton.textContent = boton.dataset.textoOriginal;
    boton.dataset.enviando = "0";
  }
  alTerminar(resultado);
}

function mensajeDeError(error) {
  if (error === "falta_nombre") return "Cuéntanos tu nombre para responderte.";
  if (error === "correo_invalido") return "Revisa el correo: no parece válido.";
  if (error === "sin_red") return "Sin conexión. Escríbenos a " + CORREO_EMPRESA + ".";
  // Incluye "sin_proveedor": el buzón todavía no está configurado. No se le
  // cuenta eso a la persona; se le da el camino que sí funciona.
  return "No pudimos enviarlo. Escríbenos directo a " + CORREO_EMPRESA + ".";
}

/** Error con ícono + texto, ligado al campo (C5 · §5 accesibilidad). */
function marcarCampo(campo, error, hayError) {
  error.classList.toggle("show", hayError);
  if (hayError) campo.setAttribute("aria-invalid", "true");
  else campo.removeAttribute("aria-invalid");
  return hayError;
}

function correoPlausible(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}
