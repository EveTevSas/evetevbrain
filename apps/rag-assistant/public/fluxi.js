/* Fluxi — widget embebible del asistente.
 *
 * Se instala con una linea:
 *   <script src="https://fluxi.evetev.com/fluxi.js" data-cliente="evetev" defer></script>
 *
 * Vive dentro de un Shadow DOM: se instala en sitios ajenos, asi que su CSS no
 * puede tocar la pagina ni la pagina tocarlo a el.
 *
 * Degrada siempre. Sin JavaScript, sin llave o con la API caida, muestra el
 * enlace de contacto — que es exactamente lo que el muñeco de la esquina hacia
 * antes. Nunca se rompe: se convierte en lo que ya era.
 */
(function () {
  "use strict";

  /* Marca por tokens. El coral NO aparece: es exclusivo del CTA global del nav
   * (regla C2 del manual). Aqui manda el azul mezclado. */
  var ESTILOS = [
    ":host,*{box-sizing:border-box}",
    ".sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;",
    "clip:rect(0 0 0 0);white-space:nowrap;border:0}",
    ".fab{position:fixed;right:18px;bottom:18px;width:60px;height:60px;border-radius:50%;",
    "border:0;background:#FDFEFF;box-shadow:0 6px 24px rgba(10,37,64,.22);cursor:pointer;",
    "display:grid;place-items:center;z-index:2147483000;transition:transform .18s ease}",
    ".fab:hover{transform:translateY(-2px)}",
    ".fab:focus-visible{outline:3px solid #1E6FEB;outline-offset:3px}",
    ".panel{position:fixed;right:18px;bottom:88px;width:min(370px,calc(100vw - 36px));",
    "max-height:min(560px,calc(100vh - 120px));display:flex;flex-direction:column;",
    "background:#FDFEFF;color:#0A2540;border:1px solid #EDF3FA;border-radius:16px;",
    "box-shadow:0 18px 48px rgba(10,37,64,.20);overflow:hidden;z-index:2147483000;",
    "font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif}",
    /* `display:flex` de la regla de arriba le gana al `[hidden]` de la hoja del
     * navegador, asi que el panel arrancaba abierto. Hay que decirlo aparte. */
    ".panel[hidden]{display:none}",
    ".cab{display:flex;align-items:center;gap:9px;padding:12px 14px;background:#EAF2FB;",
    "border-bottom:1px solid #EDF3FA}",
    ".cab b{flex:1;font-size:15px}",
    ".cerrar{border:0;background:transparent;font-size:22px;line-height:1;color:#64748B;",
    "cursor:pointer;width:32px;height:32px;border-radius:8px}",
    ".cerrar:hover{background:#FDFEFF}",
    ".cerrar:focus-visible{outline:2px solid #1E6FEB;outline-offset:2px}",
    ".hilo{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}",
    ".msg{margin:0;padding:10px 12px;border-radius:12px;max-width:88%;white-space:pre-wrap;",
    "overflow-wrap:anywhere}",
    ".msg.yo{align-self:flex-end;background:#144A96;color:#FDFEFF;border-bottom-right-radius:4px}",
    ".msg.eve{align-self:flex-start;background:#EAF2FB;border-bottom-left-radius:4px}",
    ".msg.nota{align-self:stretch;max-width:100%;background:transparent;color:#64748B;",
    "font-size:12.5px;padding:0 2px}",
    ".msg.pensando{color:#94A3B8}",
    ".msg.fuentes{align-self:flex-start;max-width:100%;background:transparent;padding:0 2px;",
    "color:#64748B;font-size:12px}",
    ".msg a{color:#1E6FEB}",
    ".pie{display:flex;gap:8px;padding:12px;border-top:1px solid #EDF3FA}",
    ".pie input#txt{flex:1;min-width:0;height:44px;padding:0 12px;border:1px solid #EDF3FA;",
    "border-radius:10px;background:#F4F9FD;color:#0A2540;font:inherit}",
    ".pie input#txt:focus-visible{outline:2px solid #1E6FEB;outline-offset:1px}",
    ".pie button{width:44px;height:44px;border:0;border-radius:10px;background:#144A96;",
    "color:#FDFEFF;font-size:18px;cursor:pointer}",
    ".pie button:focus-visible{outline:3px solid #1E6FEB;outline-offset:2px}",
    ".trampa{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}",
    /* En movil no es una ventana flotante: es una hoja inferior, que es como se
     * usa el chat en un telefono. */
    "@media (max-width:560px){",
    ".panel{right:0;left:0;bottom:0;width:100%;max-height:82vh;border-radius:16px 16px 0 0}",
    ".fab{right:14px;bottom:14px}}",
    "@media (prefers-reduced-motion:reduce){.fab{transition:none}.fab:hover{transform:none}}"
  ].join("");

  var guion = document.currentScript;
  var cfg = {
    api: (guion && guion.dataset.api) || nuevaBase(guion),
    mascota:
      (guion && guion.dataset.mascota) ||
      "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/mascota/mascota.webp",
    contacto: (guion && guion.dataset.contacto) || "mailto:contacto@evetev.com",
    nombre: (guion && guion.dataset.nombre) || "Eve",
    privacidad: (guion && guion.dataset.privacidad) || ""
  };

  function nuevaBase(g) {
    try {
      return new URL(g.src).origin;
    } catch (_) {
      return "";
    }
  }

  var anfitrion = document.createElement("div");
  anfitrion.setAttribute("data-fluxi", "");
  var raiz = anfitrion.attachShadow({ mode: "open" });
  document.body.appendChild(anfitrion);

  raiz.innerHTML = [
    "<style>" + ESTILOS + "</style>",
    '<button class="fab" type="button" aria-expanded="false" aria-controls="panel">',
    '  <img alt="" src="' + cfg.mascota + '" width="40" height="40">',
    '  <span class="sr">Abrir el asistente ' + cfg.nombre + "</span>",
    "</button>",
    '<section class="panel" id="panel" role="dialog" aria-modal="false" aria-label="Asistente ' +
      cfg.nombre +
      '" hidden>',
    '  <header class="cab">',
    '    <img alt="" src="' + cfg.mascota + '" width="28" height="28">',
    "    <b>" + cfg.nombre + "</b>",
    '    <button class="cerrar" type="button"><span class="sr">Cerrar</span>&times;</button>',
    "  </header>",
    '  <div class="hilo" role="log" aria-live="polite" aria-atomic="false"></div>',
    '  <form class="pie">',
    '    <label class="sr" for="txt">Escribe tu pregunta</label>',
    '    <input id="txt" type="text" autocomplete="off" maxlength="500" placeholder="Escribe tu pregunta…">',
    '    <input class="trampa" type="text" name="apellido2" tabindex="-1" autocomplete="off" aria-hidden="true">',
    '    <button type="submit"><span class="sr">Enviar</span>&#8593;</button>',
    "  </form>",
    "</section>"
  ].join("\n");

  var fab = raiz.querySelector(".fab");
  var panel = raiz.querySelector(".panel");
  var hilo = raiz.querySelector(".hilo");
  var forma = raiz.querySelector(".pie");
  var campo = raiz.querySelector("#txt");
  var trampa = raiz.querySelector(".trampa");
  var sesion = null;
  var ocupado = false;
  var saludado = false;

  fab.addEventListener("click", function () {
    panel.hidden ? abrir() : cerrar();
  });
  raiz.querySelector(".cerrar").addEventListener("click", cerrar);

  // Escape cierra, y el foco vuelve al boton: sin esto, quien navega con
  // teclado se queda dentro del panel sin salida.
  raiz.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      cerrar();
      return;
    }
    if (e.key !== "Tab" || panel.hidden) return;
    var focos = panel.querySelectorAll("button, input, a[href]");
    if (!focos.length) return;
    var primero = focos[0];
    var ultimo = focos[focos.length - 1];
    var activo = raiz.activeElement;
    if (e.shiftKey && activo === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  });

  function abrir() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    if (!saludado) {
      saludado = true;
      pintar(
        "eve",
        "¡Hola! Soy " +
          cfg.nombre +
          ". Respondo con la información de Evetev que tengo; si algo no lo sé, te lo digo y te paso con una persona."
      );
      if (cfg.privacidad) pintar("nota", cfg.privacidad);
    }
    campo.focus();
  }

  function cerrar() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }

  // Los identificadores son para verificar, no para leer. Y el marcado se quita
  // por si el modelo lo cuela pese a la regla 11: aqui se muestra texto plano.
  function limpiar(t) {
    return t
      .replace(/\s*\[#[^\]]+\]/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/(^|\s)[*_](\S[^*_]*\S)[*_]/g, "$1$2");
  }

  function pintarFuentes(fuentes) {
    var vistos = {};
    var nombres = [];
    fuentes.forEach(function (f) {
      var nombre = f.titulo;
      if (!vistos[nombre]) {
        vistos[nombre] = true;
        nombres.push(nombre);
      }
    });
    pintar("fuentes", "Según: " + nombres.join(" · "));
  }

  function pintar(quien, texto) {
    var linea = document.createElement("p");
    linea.className = "msg " + quien;
    linea.textContent = texto;
    hilo.appendChild(linea);
    hilo.scrollTop = hilo.scrollHeight;
    return linea;
  }

  forma.addEventListener("submit", function (e) {
    e.preventDefault();
    if (ocupado) return;
    var texto = campo.value.trim();
    if (!texto) return;
    if (trampa.value) return; // bot: se ignora en silencio
    campo.value = "";
    preguntar(texto);
  });

  function preguntar(texto) {
    ocupado = true;
    pintar("yo", texto);
    var burbuja = pintar("eve pensando", "…");

    obtenerSesion()
      .then(function () {
        return fetch(cfg.api + "/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Fluxi-Sesion": sesion },
          body: JSON.stringify({ mensaje: texto })
        });
      })
      .then(function (r) {
        if (!r.ok || !r.body)
          return r.json().then(function (d) {
            throw d;
          });
        burbuja.className = "msg eve";
        burbuja.textContent = "";
        return leerFlujo(r.body, burbuja);
      })
      .catch(function (d) {
        burbuja.className = "msg eve";
        burbuja.textContent =
          (d && d.respuesta) ||
          "Ahora mismo no puedo responder. Escríbenos y te contesta una persona.";
        var a = document.createElement("a");
        a.href = cfg.contacto;
        a.textContent = "Escríbenos";
        burbuja.appendChild(document.createTextNode(" "));
        burbuja.appendChild(a);
      })
      .then(function () {
        ocupado = false;
        campo.focus();
      });
  }

  function obtenerSesion() {
    if (sesion) return Promise.resolve(sesion);
    return fetch(cfg.api + "/api/sesion", { method: "POST" })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        sesion = d.sesion;
        return sesion;
      });
  }

  function leerFlujo(cuerpo, burbuja) {
    var lector = cuerpo.getReader();
    var dec = new TextDecoder();
    var pendiente = "";

    return (function siguiente() {
      return lector.read().then(function (r) {
        if (r.done) return;
        pendiente += dec.decode(r.value, { stream: true });
        var lineas = pendiente.split("\n");
        pendiente = lineas.pop();
        lineas.forEach(function (linea) {
          if (linea.indexOf("data:") !== 0) return;
          var ev;
          try {
            ev = JSON.parse(linea.slice(5));
          } catch (_) {
            return;
          }
          if (ev.tipo === "texto" && ev.texto) {
            // Los identificadores son para verificar, no para leer: se quitan
            // del texto visible y las fuentes salen abajo con su nombre.
            burbuja.textContent += limpiar(ev.texto);
            hilo.scrollTop = hilo.scrollHeight;
          }
          if (ev.tipo === "fin" && ev.fuentes && ev.fuentes.length) {
            pintarFuentes(ev.fuentes);
          }
        });
        return siguiente();
      });
    })();
  }
})();
