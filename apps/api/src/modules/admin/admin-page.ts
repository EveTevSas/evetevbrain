/** Panel de administración de EvePay. Se sirve como HTML desde GET /admin. */
export const ADMIN_HTML = /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin EvePay — Evetev</title>
<link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0A2540">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/tokens/colores.css">
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
.btn-sec{background:var(--eve-mezclado);color:#fff;margin-top:24px}
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
      <img src="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-azul-noche.svg" alt="" width="28">
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
