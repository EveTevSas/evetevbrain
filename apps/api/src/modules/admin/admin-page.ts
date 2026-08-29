/** Panel de administración de EvePay. Se sirve como HTML desde GET /admin. */
export const ADMIN_HTML = /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin EvePay — Evetev</title>
<link rel="icon" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAwIDEwMDAiPgo8cmVjdCB3aWR0aD0iMTAwMCIgaGVpZ2h0PSIxMDAwIiByeD0iMTkwIiBmaWxsPSIjMEEyNTQwIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyRDNFRSIgc3Ryb2tlLXdpZHRoPSI3NCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1MDAsNTAwKSBzY2FsZSgwLjc4KSB0cmFuc2xhdGUoLTUwMCwtNTAwKSI+CjxwYXRoIGQ9Ik00MDggMTUyIFE1MDAgNjAgNTkyIDE1MiBMODQ4IDQwOCBROTQwIDUwMCA4NDggNTkyIEw1OTIgODQ4IFE1MDAgOTQwIDQwOCA4NDggTDE1MiA1OTIgUTYwIDUwMCAxNTIgNDA4IFoiLz4KPHBhdGggZD0iTTYwNSAzMzcgTDUwMiA0NDAgUTQ0MiA1MDAgNTAyIDU2MCBMNjA1IDY2MyIvPgo8L2c+Cjwvc3ZnPg==" type="image/svg+xml">
<meta name="theme-color" content="#0A2540">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Tokens de color de la marca, incrustados. Copia de
   packages/brand/assets/tokens/colores.css — la API no sirve archivos
   estáticos y esta página es una sola plantilla, así que traerlos de fuera
   significaba depender de un CDN para 1,6 KB. */
/* Evetev S.A.S. — tokens de color oficiales
   Paleta votada por socios (Manual de marca v2.0)
   Uso: @import url("https://cdn.jsdelivr.net/gh/EveTev/brand@1/tokens/colores.css"); */

:root {
  /* Base */
  --eve-azul-noche: #0a2540;
  --eve-azul-noche-profundo: #081d33; /* fondo modo oscuro */
  --eve-hielo: #eaf2fb;
  --eve-tinte: #f4f9fd;
  --eve-linea: #edf3fa;
  --eve-pizarra: #64748b;
  --eve-muted: #94a3b8;

  /* Acción — exclusivo de CTAs. Un botón coral por pantalla. */
  --eve-coral: #ee3d22;
  --eve-coral-hover: #cf3016;

  /* Azules funcionales */
  --eve-electrico: #1e6feb; /* enlaces, foco */
  --eve-mezclado: #144a96; /* secundario: botones 2os, sliders, switches, gráficos */
  --eve-cian: #22d3ee; /* realce sobre oscuro */
  --eve-teal: #3baec2; /* herencia del isotipo, ilustración */

  /* Violeta Eve — territorio de Eve Intelligence. No usar en botones. */
  --eve-violeta: #8b5cf6;
  --eve-violeta-texto: #6d28d9;
  --eve-violeta-tinte: #ede9fe;

  /* Semánticos — el error SIEMPRE con ícono + texto, nunca solo color */
  --eve-exito: #16a34a;
  --eve-alerta: #d97706;
  --eve-error: #b91c1c;

  /* Degradados */
  --eve-grad-corporativo: linear-gradient(90deg, #0a2540 0%, #1e6feb 55%, #22d3ee 100%);
  --eve-grad-ia: linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #22d3ee 100%);

  /* Forma */
  --eve-radio-sm: 8px;
  --eve-radio-md: 12px;
  --eve-radio-lg: 16px;
  --eve-radio-pill: 999px;

  /* Tipografía */
  --eve-font-marca: "Baloo 2", sans-serif;
  --eve-font-ui: "Inter", sans-serif;
  --eve-font-mono: "JetBrains Mono", monospace;
}
</style>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:var(--eve-azul-noche);background:#F4F9FD;line-height:1.6;min-height:100vh}
h1,h2,h3,.brand{font-family:'Baloo 2',sans-serif;font-weight:600}
.wrap{max-width:1040px;margin:0 auto;padding:0 clamp(20px,4vw,32px)}
:focus-visible{outline:2px solid var(--eve-electrico);outline-offset:3px}

/* NAV */
nav{background:rgba(253,254,255,.97);border-bottom:1px solid var(--eve-linea);position:sticky;top:0;z-index:40;backdrop-filter:blur(8px)}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:58px}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--eve-azul-noche)}
.logo img{width:28px;height:20px}
.logo-txt{font-size:1.05rem}
.badge{font-size:.72rem;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--eve-electrico);color:#fff;margin-left:4px;letter-spacing:.03em}
.btn-salir{background:none;border:1px solid var(--eve-linea);border-radius:999px;padding:7px 18px;font-size:.8rem;color:var(--eve-pizarra);cursor:pointer;font-family:'Inter',sans-serif;transition:.15s}
.btn-salir:hover{border-color:var(--eve-error);color:var(--eve-error)}

/* AUTH GATE */
#gate{display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 58px)}
.gate-card{background:#fff;border:1px solid var(--eve-linea);border-radius:16px;padding:40px 36px;width:100%;max-width:380px;box-shadow:0 8px 32px rgba(10,37,64,.07)}
.gate-card h2{font-size:1.3rem;margin-bottom:6px}
.gate-card p{font-size:.85rem;color:var(--eve-pizarra);margin-bottom:28px}
label{display:block;font-size:.8rem;font-weight:500;margin-bottom:6px;color:var(--eve-azul-noche)}
input{width:100%;padding:11px 14px;border:1px solid #DCE7F2;border-radius:9px;font-size:.88rem;font-family:'Inter',sans-serif;color:var(--eve-azul-noche);background:#fff;transition:.15s}
input:focus{outline:2px solid var(--eve-electrico);border-color:transparent}
.err{font-size:.78rem;color:var(--eve-error);margin-top:8px;display:none}
.btn{border-radius:999px;font-weight:600;font-size:.85rem;padding:11px 24px;border:none;cursor:pointer;font-family:'Inter',sans-serif;transition:.15s}
.btn-cta{background:var(--eve-coral);color:#fff;width:100%;margin-top:20px;padding:13px}
.btn-cta:hover{background:var(--eve-coral-hover)}
.btn-cta:disabled{opacity:.55;cursor:not-allowed}

/* MAIN */
#main{display:none;padding:36px 0 64px}
.page-title{font-size:clamp(1.3rem,2.5vw,1.6rem);margin-bottom:6px}
.page-sub{font-size:.88rem;color:var(--eve-pizarra);margin-bottom:36px}

/* SECCIÓN CREAR */
.section{background:#fff;border:1px solid var(--eve-linea);border-radius:14px;padding:28px 28px 32px;margin-bottom:32px}
.section h2{font-size:1rem;margin-bottom:4px}
.section .desc{font-size:.82rem;color:var(--eve-pizarra);margin-bottom:22px}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.field{display:flex;flex-direction:column}
.btn-sec{background:var(--eve-mezclado);color:#fff;margin-top:24px;border-radius:999px}
.btn-sec:hover{background:#0F3C7F}
.btn-sec:disabled{opacity:.55;cursor:not-allowed}

/* TABLA */
table{width:100%;border-collapse:collapse;font-size:.84rem;margin-top:12px}
th{text-align:left;padding:10px 14px;font-size:.75rem;font-weight:600;color:var(--eve-pizarra);border-bottom:2px solid var(--eve-linea);text-transform:uppercase;letter-spacing:.04em}
td{padding:12px 14px;border-bottom:1px solid var(--eve-linea);vertical-align:top}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--eve-tinte)}
.mono{font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--eve-mezclado)}
.pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.72rem;font-weight:600}
.pill-ok{background:#DCFCE7;color:#15803D}
.pill-rev{background:#FEF9C3;color:#A16207}
.pill-err{background:#FEE2E2;color:#B91C1C}
.pill-live{background:#EFF6FF;color:var(--eve-mezclado)}
.pill-test{background:var(--eve-tinte);color:var(--eve-pizarra)}
.empty{text-align:center;padding:40px 0;color:var(--eve-muted);font-size:.88rem}
.spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;margin-right:6px;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}

/* MODAL KEYS */
#modal-overlay{display:none;position:fixed;inset:0;background:rgba(10,37,64,.38);z-index:100;align-items:center;justify-content:center}
#modal-overlay.open{display:flex}
.modal{background:#fff;border-radius:16px;padding:36px;max-width:540px;width:90%;box-shadow:0 24px 64px rgba(10,37,64,.18)}
.modal h3{font-size:1.1rem;margin-bottom:6px}
.modal .sub{font-size:.82rem;color:var(--eve-pizarra);margin-bottom:24px}
.modal .alerta{background:#FEF3C7;border:1px solid #FCD34D;border-radius:9px;padding:10px 14px;font-size:.78rem;color:#92400E;margin-bottom:20px}
.key-block{margin-bottom:16px}
.key-block label{margin-bottom:6px}
.key-row{display:flex;gap:8px;align-items:center}
.key-val{flex:1;background:var(--eve-tinte);border:1px solid var(--eve-linea);border-radius:8px;padding:10px 12px;font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--eve-azul-noche);overflow:auto;white-space:nowrap}
.btn-copy{background:none;border:1px solid var(--eve-linea);border-radius:999px;padding:8px 16px;font-size:.78rem;cursor:pointer;color:var(--eve-electrico);font-family:'Inter',sans-serif;font-weight:600;transition:.15s;white-space:nowrap}
.btn-copy:hover{background:var(--eve-hielo)}
.btn-copy.copiado{color:var(--eve-exito);border-color:var(--eve-exito)}
.btn-cerrar{background:var(--eve-azul-noche);color:#fff;width:100%;margin-top:8px;padding:12px}
.btn-cerrar:hover{background:#0d3060}

/* TOAST */
#toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--eve-azul-noche);color:#fff;border-radius:999px;padding:10px 24px;font-size:.84rem;opacity:0;transition:.3s;pointer-events:none;z-index:200}
#toast.show{opacity:1}

@media(max-width:760px){
  .fields{grid-template-columns:1fr}
  .modal{padding:24px}
  .section{padding:22px 18px 26px}
}
</style>
</head>
<body>

<nav>
  <div class="wrap nav-in">
    <a class="logo" href="/admin" aria-label="Evetev Admin">
      <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5OTIgNjkyIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDY5Mikgc2NhbGUoMC4xLC0wLjEpIiBmaWxsPSIjMEEyNTQwIiBzdHJva2U9Im5vbmUiPjxwYXRoIGQ9Ik0zNjc1IDY3MDcgYzE2MyAtNTQgMTY1IC01NiA3NDAgLTYzNCAyOTIgLTI5NCA1MzcgLTUzNCA1NDUgLTUzMyA4IDAgMjUzIDI0MCA1NDUgNTMzIDU2NyA1NzEgNTY3IDU3MSA3MjggNjMxIDc4IDI5IDg5IDMwIDI0MiAzMCAxNTUgMSAxNjMgMCAyNDggLTMwIDQ4IC0xOCAxMTMgLTQ3IDE0NSAtNjUgNTggLTM1IDI2NSAtMjM3IDc2MiAtNzQ0IDYzOSAtNjUzIDEyODAgLTEzMDYgMTUwNiAtMTUzNSAzNzIgLTM3NyA0MDkgLTQyMCA0NzEgLTUzNiA1OSAtMTEwIDc4IC0yMDAgNzggLTM2NCAwIC0xNjYgLTE5IC0yNTMgLTgxIC0zNzEgLTU0IC0xMDIgLTExMCAtMTY0IC01NzEgLTYzMCAtMjM1IC0yMzggLTQ0OCAtNDUzIC00NzMgLTQ3OSAtMTM2IC0xNDAgLTEyNjUgLTEyODQgLTE0MzUgLTE0NTUgLTE3NyAtMTc3IC0yMTAgLTIwNiAtMjgxIC0yNDIgLTE1OCAtODIgLTM2MSAtMTA4IC01NDQgLTY5IC0xNTEgMzIgLTMzOSAxNTIgLTQ1OSAyOTIgLTE4IDIxIC0xNzYgMTgzIC0zNTAgMzU5IC0xNzQgMTc2IC0zNjAgMzY2IC00MTQgNDIzIC01OCA2MSAtMTA1IDEwMiAtMTE2IDEwMiAtMTEgMCAtNTIgLTM1IC05OCAtODIgLTQzIC00NiAtMTEyIC0xMTcgLTE1MyAtMTU4IC00MSAtNDIgLTIyMSAtMjI0IC00MDAgLTQwNSAtMTc5IC0xODEgLTM1NCAtMzU0IC0zOTAgLTM4NCAtMTQxIC0xMTggLTMwNCAtMTY3IC01MTkgLTE1OCAtMTYzIDcgLTI3OSA0MyAtMzk4IDEyNCAtNjYgNDUgOTQgLTExNiAtMTYyMyAxNjMzIC0xMDQ4IDEwNjggLTEwMDggMTAyNSAtMTA2NSAxMTQ0IC0xMDkgMjI1IC0xMTIgNDk0IC05IDcwMSA3MSAxNDEgNDUgMTEzIDgwNCA4ODYgMjQ1IDI1MCA2NzIgNjg2IDk1MCA5NjkgODA2IDgyMiA4OTggOTEzIDk3NSA5NjMgMTQ4IDk1IDIzMyAxMTggNDIwIDExNCAxMTggLTMgMTUyIC04IDIyMCAtMzB6IE0zMzcwIDYyODYgYy0yNiAtNiAtNjIgLTIyIC04MSAtMzMgLTE5IC0xMiAtMTI0IC0xMTMgLTIzNCAtMjI1IC0xMDkgLTExMiAtMzUyIC0zNTkgLTUzOSAtNTQ5IC0xODggLTE5MCAtNTMwIC01MzggLTc2MSAtNzc1IC02OTAgLTcwNiAtOTE5IC05MzggLTkzMiAtOTQ3IC03IC00IC0xMyAtMTUgLTEzIC0yMiAwIC0xMyAxNDYgLTE1IDExMDAgLTE1IDEwMjMgMCAxMTAwIC0xIDExMDkgLTE3IDYgLTExIDUgLTI2IC0yIC00MiAtNyAtMTYgLTExIC05OSAtMTEgLTIxMSAwIC0xNTAgNCAtMTkzIDE3IC0yMjkgMTQgLTM1IDE1IC00NiA1IC01MyAtNyAtNCAtNTAwIC04IC0xMDk1IC04IC01OTUgMCAtMTA4NCAtNCAtMTA4NyAtOCAtMiAtNCAxNTMgLTE2NyAzNDUgLTM2MiA1MDUgLTUxMiA2ODkgLTY5OSAxMjAzIC0xMjI1IDYzMCAtNjQ1IDg0NiAtODU2IDkwOCAtODkwIDM4IC0yMSA3MCAtMjkgMTIyIC0zMyA2NCAtNCA3OSAtMSAxNDAgMjcgODIgMzcgNDcgMiAxNTM2IDE1MTYgMTQ2IDE0OSA0NDQgNDUxIDY2MiA2NzIgNDU4IDQ2NSA0NTMgNDU4IDQ1MyA2MDggMCAxNDQgNyAxMzQgLTQ4OSA2NDAgLTQyMyA0MzEgLTQzMCA0MzggLTQ1MSA0ODkgLTIxIDUwIC0xOSAxMzkgNCAxODUgNDAgNzggMTI0IDEzMSAyMDkgMTMxIDc2IDAgMTA3IC0yNyA1NTIgLTQ3OSAyMzcgLTI0MCA0NTAgLTQ2MyA0NzQgLTQ5NiA1NSAtNzIgOTYgLTE1NiAxMjggLTI1NSAyMCAtNjQgMjMgLTk2IDIzIC0yMTUgMCAtMTAyIC01IC0xNTggLTE4IC0yMDUgLTIxIC03OSAtNzMgLTE4OSAtMTE4IC0yNTEgLTI4IC0zOSAtNzM1IC03NjUgLTExMzEgLTExNjIgLTYwIC01OSAtMTA4IC0xMTUgLTEwOCAtMTIzIDAgLTE1IDMwMSAtMzI2IDc4NyAtODEyIDE3OSAtMTc5IDIyMiAtMjE3IDI3NSAtMjQyIDg0IC00MCAxNzEgLTQxIDI1NCAtNSA2MSAyNyAxMjAgODQgNTkzIDU3MCAxMTIgMTE2IDMxMCAzMTggNDQwIDQ1MCAxMzAgMTMyIDM1NSAzNjIgNTAwIDUxMCAxNDYgMTQ5IDQxNCA0MjEgNTk4IDYwNiAxODMgMTg1IDMzMyAzNDIgMzMzIDM0OCAwIDggLTI5NiAxMSAtMTA3OSAxMSAtNTk0IDAgLTEwODYgMyAtMTA5NCA2IC0xMyA1IC0xMiAxNCA1IDcyIDI3IDg5IDMwIDMwOCA2IDM5NSAtMjAgNzEgLTE1IDg3IDI2IDg3IDIyNyA0IDIxMzcgLTIgMjE1NCAtNyA1NSAtMTMgNiA0NyAtMjM3IDI5NCAtNjU2IDY2NSAtODM5IDg1MSAtMTI5MSAxMzEzIC04MjggODQ2IC04OTkgOTE2IC05NjYgOTQ3IC00NiAyMiAtNzMgMjggLTEyNCAyNyAtMTIxIC0xIC0xMzYgLTEzIC00NDcgLTMyOCAtNDY4IC00NzUgLTEzODYgLTE0MDkgLTE2MDQgLTE2MzEgLTExMyAtMTE1IC0zMDEgLTMwNyAtNDE4IC00MjYgLTExNiAtMTE4IC0yMjcgLTIzNyAtMjQ1IC0yNjIgLTQ0IC02MSAtNTkgLTEyMCAtNTQgLTIwNSA2IC0xMTcgMjYgLTE0MyAzNjkgLTQ5NCA1MjMgLTUzNSA1MzIgLTU0NCA1NjcgLTYxMSAyOSAtNTMgMzMgLTY5IDI4IC0xMTAgLTE5IC0xNzAgLTE3NyAtMjU4IC0zMjggLTE4NCAtNDAgMjAgLTkyIDY4IC0yMTMgMTk0IC04OCA5MiAtMjM3IDI0NyAtMzMxIDM0MyAtMzk0IDQwMyAtNDI0IDQzNyAtNDc0IDU0NSAtMTMwIDI4MSAtODQgNjE4IDExNCA4NDMgNTYgNjQgMjcxIDI4NCA5MDggOTI4IDE1OCAxNjAgMjg4IDI5NyAyODggMzA0IDAgMTQgLTI1MCAyNzQgLTcwNyA3MzcgLTMyMSAzMjUgLTM0OCAzNDYgLTQ1MyAzNTYgLTMwIDMgLTc1IDAgLTEwMCAtN3oiLz48L2c+PC9zdmc+" alt="" width="28">
      <span class="brand logo-txt">Evetev</span>
      <span class="badge">Admin EvePay</span>
    </a>
    <button class="btn btn-salir" id="btn-salir" style="display:none" onclick="salir()">Cerrar sesión</button>
  </div>
</nav>

<!-- AUTH GATE -->
<div id="gate">
  <div class="gate-card">
    <h2>Panel de administración</h2>
    <p>Solo para uso interno de Evetev. Ingresa la clave de administrador para continuar.</p>
    <label for="inp-secret">Clave de administrador</label>
    <input type="password" id="inp-secret" placeholder="••••••••••••••••••••" autocomplete="off">
    <div class="err" id="gate-err">Clave incorrecta. Verifica e intenta de nuevo.</div>
    <button class="btn btn-cta" id="btn-entrar" onclick="entrar()">Entrar</button>
  </div>
</div>

<!-- MAIN -->
<div id="main">
  <div class="wrap">
    <h1 class="page-title">Comercios</h1>
    <p class="page-sub">Gestiona los comercios que operan en EvePay.</p>

    <!-- CREAR COMERCIO -->
    <div class="section">
      <h2>Nuevo comercio</h2>
      <p class="desc">Crea el tenant, lo registra en el proveedor y genera las API keys (live + test). Las claves aparecen una sola vez.</p>
      <div class="fields">
        <div class="field">
          <label for="inp-legal">Razón social</label>
          <input type="text" id="inp-legal" placeholder="Ej: Veterinaria Las Mascotas SAS">
        </div>
        <div class="field">
          <label for="inp-display">Nombre comercial</label>
          <input type="text" id="inp-display" placeholder="Ej: Veterinaria Las Mascotas">
        </div>
      </div>
      <div class="err" id="crear-err"></div>
      <button class="btn btn-sec" id="btn-crear" onclick="crearComercio()">Crear comercio</button>
    </div>

    <!-- LISTA -->
    <div class="section">
      <h2>Comercios registrados</h2>
      <p class="desc">Todos los comercios activos en la plataforma.</p>
      <div id="tabla-wrap"><p class="empty">Cargando…</p></div>
    </div>
  </div>
</div>

<!-- MODAL KEYS -->
<div id="modal-overlay" role="dialog" aria-modal="true" aria-label="API keys del comercio">
  <div class="modal">
    <h3>Comercio creado</h3>
    <p class="sub">Comparte estas claves con el comercio ahora. No se pueden recuperar después.</p>
    <div class="alerta">⚠️ Guarda las claves antes de cerrar esta ventana. Solo se muestran una vez.</div>
    <div class="key-block">
      <label>API key de producción (live)</label>
      <div class="key-row">
        <div class="key-val" id="key-live"></div>
        <button class="btn-copy" onclick="copiar('key-live',this)">Copiar</button>
      </div>
    </div>
    <div class="key-block">
      <label>API key de sandbox (test)</label>
      <div class="key-row">
        <div class="key-val" id="key-test"></div>
        <button class="btn-copy" onclick="copiar('key-test',this)">Copiar</button>
      </div>
    </div>
    <button class="btn btn-cerrar" onclick="cerrarModal()">Ya copié las claves, cerrar</button>
  </div>
</div>

<div id="toast"></div>

<script>
const API = '/v1/admin/merchants';

function getSecret(){ return sessionStorage.getItem('adminSecret') || ''; }
function authHeaders(){ return {'content-type':'application/json','x-admin-secret':getSecret()}; }

async function entrar(){
  const s = document.getElementById('inp-secret').value.trim();
  if(!s) return;
  const btn = document.getElementById('btn-entrar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Verificando…';
  try{
    const r = await fetch(API,{headers:{'x-admin-secret':s}});
    if(r.status===200||r.status===204){
      sessionStorage.setItem('adminSecret',s);
      mostrarMain();
    } else {
      document.getElementById('gate-err').style.display='block';
    }
  } catch(e){
    document.getElementById('gate-err').textContent='Error de red. Verifica que la API esté activa.';
    document.getElementById('gate-err').style.display='block';
  } finally{
    btn.disabled=false;
    btn.textContent='Entrar';
  }
}

function mostrarMain(){
  document.getElementById('gate').style.display='none';
  document.getElementById('main').style.display='block';
  document.getElementById('btn-salir').style.display='';
  cargarComercios();
}

function salir(){
  sessionStorage.removeItem('adminSecret');
  location.reload();
}

document.getElementById('inp-secret').addEventListener('keydown',e=>{if(e.key==='Enter')entrar()});

async function crearComercio(){
  const legalName = document.getElementById('inp-legal').value.trim();
  const displayName = document.getElementById('inp-display').value.trim();
  const errEl = document.getElementById('crear-err');
  errEl.style.display='none';
  if(!legalName||!displayName){
    errEl.textContent='Completa ambos campos.'; errEl.style.display='block'; return;
  }
  const btn = document.getElementById('btn-crear');
  btn.disabled=true;
  btn.innerHTML='<span class="spin"></span>Creando…';
  try{
    const r = await fetch(API,{method:'POST',headers:authHeaders(),body:JSON.stringify({legalName,displayName})});
    if(!r.ok){ const e=await r.json(); throw new Error(e.message||'Error al crear'); }
    const data = await r.json();
    document.getElementById('key-live').textContent = data.apiKey;
    document.getElementById('key-test').textContent = data.testApiKey;
    document.getElementById('modal-overlay').classList.add('open');
    document.getElementById('inp-legal').value='';
    document.getElementById('inp-display').value='';
    cargarComercios();
  } catch(e){
    errEl.textContent = e.message||'Error inesperado.';
    errEl.style.display='block';
  } finally{
    btn.disabled=false; btn.textContent='Crear comercio';
  }
}

async function cargarComercios(){
  const wrap = document.getElementById('tabla-wrap');
  wrap.innerHTML='<p class="empty">Cargando…</p>';
  try{
    const r = await fetch(API,{headers:authHeaders()});
    if(!r.ok) throw new Error('Error al cargar');
    const data = await r.json();
    if(!data.length){ wrap.innerHTML='<p class="empty">Sin comercios aún. Crea el primero arriba.</p>'; return; }
    wrap.innerHTML=renderTabla(data);
  } catch(e){
    wrap.innerHTML='<p class="empty" style="color:var(--eve-error)">Error al cargar comercios.</p>';
  }
}

function renderTabla(comercios){
  const filas = comercios.map(c=>{
    const estadoPill = c.merchantEstado==='aprobado'
      ? '<span class="pill pill-ok">Aprobado</span>'
      : c.merchantEstado==='rechazado'
        ? '<span class="pill pill-err">Rechazado</span>'
        : '<span class="pill pill-rev">En revisión</span>';
    const keys = (c.apiKeys||[]).map(k=>
      \`<div><span class="pill \${k.environment==='live'?'pill-live':'pill-test'}">\${k.environment}</span>
       <span class="mono" style="margin-left:4px">\${k.prefix}…</span>
       \${k.activa?'':'<span class="pill pill-err" style="margin-left:4px">Revocada</span>'}</div>\`
    ).join('');
    return \`<tr>
      <td><strong>\${esc(c.displayName)}</strong><br><span class="mono" style="font-size:.72rem">\${esc(c.tenantId)}</span></td>
      <td>\${esc(c.legalName)}</td>
      <td>\${estadoPill}</td>
      <td>\${keys||'—'}</td>
      <td style="color:var(--eve-muted);font-size:.78rem">\${fechaCorta(c.creadoEn)}</td>
    </tr>\`;
  }).join('');
  return \`<table>
    <thead><tr>
      <th>Comercio</th><th>Razón social</th><th>Estado</th><th>API keys</th><th>Creado</th>
    </tr></thead>
    <tbody>\${filas}</tbody>
  </table>\`;
}

function cerrarModal(){
  document.getElementById('modal-overlay').classList.remove('open');
}

function copiar(id,btn){
  const txt = document.getElementById(id).textContent;
  navigator.clipboard.writeText(txt).then(()=>{
    btn.textContent='¡Copiado!'; btn.classList.add('copiado');
    setTimeout(()=>{ btn.textContent='Copiar'; btn.classList.remove('copiado'); },2000);
  });
}

function esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function fechaCorta(iso){ return iso ? new Date(iso).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : ''; }

document.getElementById('modal-overlay').addEventListener('click',e=>{
  if(e.target===document.getElementById('modal-overlay')) cerrarModal();
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape') cerrarModal(); });

// Auto-login si ya hay secret en sesión
if(getSecret()) mostrarMain();
</script>
</body>
</html>`;
