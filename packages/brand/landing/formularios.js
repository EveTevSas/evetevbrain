/* Envío de los formularios de demo de las landings de producto.
   Fuente única: se replica en cada landing con `pnpm landings:sync`.

   Las landings son estáticas y viven en dominios propios, así que NO tienen
   función serverless: el formulario llama al endpoint del sitio corporativo,
   que es el único que conoce la credencial del proveedor de correo. Ese
   endpoint permite estos orígenes por CORS (ver apps/website/api/contacto.js).

   Contrato con el marcado — la landing no escribe JavaScript, solo esto:

     <form class="demo-form" data-demo="evepay">   ← clave del producto
       …campos con name= (nombre, correo, mensaje, volumen, unidades…)
       <input name="sitio" …>                      ← trampa antibots, oculta
       <p class="demo-estado" data-estado role="status"></p>
       <button type="submit">…</button>
     </form>

   Regla que guía el manejo de errores, igual que en el sitio corporativo: si
   el envío falla, la persona nunca se queda sin salida. Siempre se le ofrece
   el correo directo de la empresa, que funciona aunque el backend no. */

(function () {
  var ENDPOINT = 'https://evetev.com/api/contacto';
  var CORREO_EMPRESA = 'contacto@evetev.com';

  function mensajeDeError(error) {
    if (error === 'falta_nombre') return 'Cuéntanos tu nombre para responderte.';
    if (error === 'correo_invalido') return 'Revisa el correo: no parece válido.';
    if (error === 'sin_red') return 'Sin conexión. Escríbenos a ' + CORREO_EMPRESA + '.';
    // Incluye "sin_proveedor": el buzón todavía no está configurado. No se le
    // cuenta eso a la persona; se le da el camino que sí funciona.
    return 'No pudimos enviarlo. Escríbenos directo a ' + CORREO_EMPRESA + '.';
  }

  function mostrarEstado(estado, texto, tipo) {
    if (!estado) return;
    estado.textContent = texto;
    estado.className = 'demo-estado ' + tipo;
  }

  function preparar(form) {
    var estado = form.querySelector('[data-estado]');
    var boton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();

      // Candado de reentrada. Deshabilitar el botón no basta: un Enter en un
      // campo vuelve a entrar y manda el correo dos veces. El rótulo original
      // se guarda UNA sola vez, porque al reentrar se guardaría "Enviando…" y
      // el botón se quedaría con ese texto para siempre.
      if (form.dataset.enviando === '1') return;
      form.dataset.enviando = '1';
      if (boton) {
        if (!boton.dataset.textoOriginal) boton.dataset.textoOriginal = boton.textContent;
        boton.disabled = true;
        boton.textContent = 'Enviando…';
      }
      mostrarEstado(estado, '', '');

      /* Los campos viajan tal cual los nombra el marcado: el servidor tiene su
         propia lista blanca, así que añadir un campo a una landing no obliga a
         tocar este archivo —que es compartido— sino solo aquella función. */
      var datos = {};
      new FormData(form).forEach(function (valor, clave) {
        datos[clave] = valor;
      });
      datos.tipo = 'demo';
      datos.producto = form.dataset.demo;
      /* El host real, no una etiqueta fija: así un envío desde una preview de
         Vercel o desde localhost se distingue de uno de un cliente. */
      datos.origen = window.location.host + ' — formulario de demo';

      var resultado;
      try {
        var r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos)
        });
        var cuerpo = {};
        try {
          cuerpo = await r.json();
        } catch (e) {
          /* respuesta sin JSON: se trata como fallo genérico */
        }
        resultado =
          r.ok && cuerpo.ok ? { ok: true } : { ok: false, error: cuerpo.error || 'envio_fallido' };
      } catch (e) {
        resultado = { ok: false, error: 'sin_red' };
      }

      form.dataset.enviando = '0';
      if (boton) {
        boton.disabled = false;
        boton.textContent = boton.dataset.textoOriginal;
      }

      if (resultado.ok) {
        var nombre = (datos.nombre || '').trim().split(' ')[0];
        form.reset();
        mostrarEstado(
          estado,
          'Gracias' + (nombre ? ', ' + nombre : '') + '. Te respondemos en un día hábil.',
          'ok'
        );
      } else {
        mostrarEstado(estado, mensajeDeError(resultado.error), 'error');
      }
    });
  }

  document.querySelectorAll('form[data-demo]').forEach(preparar);
})();
