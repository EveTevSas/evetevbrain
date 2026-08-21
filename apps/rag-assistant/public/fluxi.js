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
    "display:grid;place-items:center;z-index:2147483000;transition:transform .18s ease;",
    "overflow:hidden;isolation:isolate}",
    ".fab img{position:relative;z-index:1}",
    /* Bruma dentro del círculo: dice «aquí hay algo vivo» sin pedir nada. Son
     * dos manchas desenfocadas que se mueven despacio, animadas con `transform`
     * —que va en la GPU— y no con posiciones, que obligan al navegador a
     * recalcular la página en cada fotograma.
     *
     * El coral va a opacidad muy baja y difuminado: el manual lo reserva para el
     * CTA global del nav (C2) y la portada ya tiene uno. Así es atmósfera, no un
     * segundo botón compitiendo por la mirada. */
    ".bruma{position:absolute;inset:0;border-radius:50%;overflow:hidden;z-index:0}",
    '.bruma::before,.bruma::after{content:"";position:absolute;width:88%;height:88%;',
    "border-radius:50%;filter:blur(13px);will-change:transform,opacity}",
    ".bruma::before{background:#1E6FEB;opacity:.30;animation:fluxi-bruma-a 5.5s ease-in-out infinite}",
    ".bruma::after{background:#EE3D22;opacity:.16;animation:fluxi-bruma-b 7s ease-in-out infinite}",
    /* El recorrido tiene que ser MAYOR que el desenfoque o no se percibe: con
     * manchas de 53 px difuminadas 13 px, moverlas 7 px era invisible. Ahora
     * barren un tercio del círculo y además laten en opacidad, que es lo que de
     * verdad se lee como «hay algo vivo» — el ojo detecta antes un cambio de
     * brillo que un desplazamiento lento. La mascota tapa el centro, así que el
     * movimiento tiene que entrar y salir del anillo visible. */
    "@keyframes fluxi-bruma-a{",
    "0%{transform:translate(-34%,18%) scale(.92);opacity:.22}",
    "30%{transform:translate(26%,-24%) scale(1.32);opacity:.42}",
    "60%{transform:translate(14%,30%) scale(.86);opacity:.26}",
    "100%{transform:translate(-34%,18%) scale(.92);opacity:.22}}",
    "@keyframes fluxi-bruma-b{",
    "0%{transform:translate(32%,-16%) scale(1.1);opacity:.12}",
    "35%{transform:translate(-28%,26%) scale(.82);opacity:.26}",
    "70%{transform:translate(-8%,-32%) scale(1.34);opacity:.16}",
    "100%{transform:translate(32%,-16%) scale(1.1);opacity:.12}}",
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
    ".saludo{position:fixed;right:88px;bottom:26px;width:min(280px,calc(100vw - 110px));",
    "background:#FDFEFF;color:#0A2540;border:1px solid #EDF3FA;border-radius:14px;padding:14px;",
    "box-shadow:0 12px 32px rgba(10,37,64,.18);z-index:2147483000;",
    "font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,sans-serif;",
    "animation:fluxi-entra .25s ease}",
    ".saludo[hidden]{display:none}",
    ".saludo-txt{margin:0 18px 10px 0}",
    ".saludo-cta{border:0;border-radius:9px;background:#144A96;color:#FDFEFF;font:inherit;",
    "font-weight:600;padding:9px 14px;cursor:pointer;min-height:38px}",
    ".saludo-cta:focus-visible{outline:3px solid #1E6FEB;outline-offset:2px}",
    ".saludo-x{position:absolute;top:6px;right:6px;width:28px;height:28px;border:0;",
    "background:transparent;color:#94A3B8;font-size:17px;line-height:1;cursor:pointer;",
    "border-radius:7px}",
    ".saludo-x:hover{background:#EAF2FB;color:#64748B}",
    ".saludo-x:focus-visible{outline:2px solid #1E6FEB;outline-offset:1px}",
    "@keyframes fluxi-entra{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
    /* En movil no es una ventana flotante: es una hoja inferior, que es como se
     * usa el chat en un telefono. */
    "@media (max-width:560px){",
    ".panel{right:0;left:0;bottom:0;width:100%;max-height:82vh;border-radius:16px 16px 0 0}",
    ".fab{right:14px;bottom:14px}",
    ".saludo{right:14px;left:14px;bottom:84px;width:auto}}",
    /* Quien pidió menos movimiento no ve nada moverse. La bruma se queda, pero
     * quieta: sigue dando el matiz de color sin agitarse. */
    "@media (prefers-reduced-motion:reduce){.fab{transition:none}.fab:hover{transform:none}",
    ".saludo{animation:none}",
    ".bruma::before,.bruma::after{animation:none}}"
  ].join("");

  var guion = document.currentScript;
  var cfg = {
    api: (guion && guion.dataset.api) || nuevaBase(guion),
    mascota:
      (guion && guion.dataset.mascota) ||
      "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/mascota/mascota.webp",
    contacto: (guion && guion.dataset.contacto) || "mailto:contacto@evetev.com",
    nombre: (guion && guion.dataset.nombre) || "Eve",
    saludo:
      (guion && guion.dataset.saludo) ||
      "¿Dudas sobre EvePay o EveConecta? Pregúntame: respondo con la información de Evetev.",
    // Cuánto espera antes de asomarse. 0 lo desactiva.
    saludoEspera: Number((guion && guion.dataset.saludoEspera) || 10000),
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
    '<aside class="saludo" aria-label="Mensaje de ' + cfg.nombre + '" hidden>',
    '  <p class="saludo-txt"></p>',
    '  <button class="saludo-cta" type="button">Pregúntame</button>',
    '  <button class="saludo-x" type="button"><span class="sr">Descartar el mensaje</span>&times;</button>',
    "</aside>",
    '<button class="fab" type="button" aria-expanded="false" aria-controls="panel">',
    '  <span class="bruma" aria-hidden="true"></span>',
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
  var saludo = raiz.querySelector(".saludo");
  var sesion = null;
  var ocupado = false;
  var saludado = false;
  var temporizadorSaludo = null;

  /* El saludo se asoma UNA vez por sesión de navegación, no cada N segundos.
   * Un globo que reaparece cada rato es un banner: molesta, tapa contenido y a
   * quien navega con lector de pantalla le interrumpe. Una vez basta para decir
   * qué es esto, y después queda a un toque de la mascota. */
  (function asomarUnaVez() {
    if (!cfg.saludoEspera || !cfg.saludo) return;
    try {
      if (sessionStorage.getItem("fluxi-saludo") === "visto") return;
    } catch (_) {
      /* sin sessionStorage (modo privado): se muestra igual, una vez por carga */
    }
    setTimeout(function () {
      if (!panel.hidden) return; // ya está conversando: no se le interrumpe
      raiz.querySelector(".saludo-txt").textContent = cfg.saludo;
      saludo.hidden = false;
      marcarSaludoVisto();
      // Se retira solo, salvo que la persona lo esté mirando de cerca.
      temporizadorSaludo = setTimeout(function () {
        if (saludo.contains(raiz.activeElement)) return;
        ocultarSaludo();
      }, 12000);
    }, cfg.saludoEspera);
  })();

  function marcarSaludoVisto() {
    try {
      sessionStorage.setItem("fluxi-saludo", "visto");
    } catch (_) {
      /* da igual: el peor caso es que se asome otra vez al recargar */
    }
  }

  function ocultarSaludo() {
    clearTimeout(temporizadorSaludo);
    temporizadorSaludo = null;
    saludo.hidden = true;
  }

  saludo.addEventListener("mouseenter", function () {
    clearTimeout(temporizadorSaludo);
  });
  raiz.querySelector(".saludo-cta").addEventListener("click", function () {
    ocultarSaludo();
    abrir();
  });
  raiz.querySelector(".saludo-x").addEventListener("click", function () {
    ocultarSaludo();
    fab.focus();
  });

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
    ocultarSaludo();
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
      .then(enviar)
      .then(function (r) {
        // Una sesión puede dejar de valer por caducidad o porque respondió otra
        // instancia del servidor. No es un error que merezca enseñarle a nadie:
        // se pide una nueva y se reintenta UNA vez.
        if (r.status !== 401) return r;
        sesion = null;
        return obtenerSesion().then(enviar);
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

    function enviar() {
      return fetch(cfg.api + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Fluxi-Sesion": sesion },
        body: JSON.stringify({ mensaje: texto })
      });
    }
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
