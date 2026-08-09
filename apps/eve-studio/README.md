# @evetev/eve-studio

Agente que genera interfaces de usuario a partir del manual de marca. Python +
LangGraph, con **Kimi (Moonshot)** como motor. Lee los activos de marca del
repositorio `Evetev-Dev/brand` y el código de este monorepo, ambos en GitHub y
en solo lectura, para partir de lo que ya existe en vez de reescribirlo.

La constitución (§8) dice: *"Servicio de IA en Python: cuando aparezca, entra
como `apps/ai` en el mismo monorepo."* Se respeta el fondo —vive en el monorepo,
como una app más— pero se usa el nombre del producto en lugar de `ai`, que es
genérico y quedaría ocupado por un solo agente si mañana hay más. La estructura
sigue plana, igual que el resto de apps. **Conviene actualizar esa línea de la
constitución por PR** para que el documento y el repo no divergan.

```
apps/eve-studio/
├── public/index.html   # la interfaz: chat + previsualización en vivo
├── api/index.py        # backend HTTP (FastAPI + LangGraph)
├── agente_cli.py       # el REPL original, para usarlo en local
├── requirements.txt    # en la raíz: Vercel detecta dependencias desde aquí
├── vercel.json         # outputDirectory: public + la función Python
├── package.json        # scripts no-op: formaliza la app en el workspace de pnpm
└── .env.example
```

## La interfaz

Estática y sin dependencias ni paso de compilación: Vercel sirve `public/` y la
misma app expone `/api/chat`. Es el mismo patrón que ya usa `apps/website`
(estáticos + una función en `api/`), que está funcionando en producción.

- Chat a la izquierda, previsualización en vivo a la derecha, con pestaña para
  ver el código, copiarlo o descargarlo.
- El HTML generado se inyecta en un `<iframe>` con `srcdoc` y **`sandbox`**: se
  renderiza aislado y no puede tocar la página que lo contiene.
- **El token se pide una vez** y se guarda en `localStorage` del navegador. Sin
  él la API responde 401, así que la interfaz lo pide antes de dejar generar.
- El historial vive en el estado del cliente y se reenvía completo en cada
  petición. Un turno que falla **no entra al historial**, para no ensuciar el
  contexto del agente.

## Correr en local

```bash
cd apps/eve-studio
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # y completa las llaves
```

El REPL de siempre (guarda memoria en `contexto/` y la salida en `salida/`):

```bash
python agente_cli.py
```

La API, igual que en producción:

```bash
uvicorn api.index:app --reload --port 3003
# comprobar: curl http://localhost:3003/api/health
```

## Desplegar en Vercel

Es un **proyecto de Vercel aparte**, apuntando al mismo repositorio. En
*Settings → General*:

- **Root Directory:** `apps/eve-studio`

En *Settings → Environment Variables* (nunca en el repo, §4):

| Variable | Para qué |
|---|---|
| `MOONSHOT_API_KEY` | motor del agente |
| `GITHUB_TOKEN` | leer los activos de marca (solo lectura) |
| `GITHUB_TOKEN_CODIGO` | leer el monorepo — **opcional hoy**, ver abajo |
| `AGENTE_API_TOKEN` | protege el endpoint — `openssl rand -hex 32` |

### Verificar el primer despliegue

El enrutado de una app ASGI en Vercel es el punto más delicado de este montaje,
así que **compruébalo antes de dar por bueno el deploy**:

```bash
curl https://<tu-deploy>.vercel.app/api/health
```

Debe devolver un JSON con `"ok": true` y los tres flags de configuración.

En el primer despliegue devolvió el **404 de la plataforma** (con `Code:
NOT_FOUND`, distinto del 404 de FastAPI): la petición no llegaba a la función.
Vercel publica la función Python en `/api/index` y no dedujo que el resto de
rutas del router ASGI le pertenecen. Por eso `vercel.json` lleva

```json
"rewrites": [{ "source": "/api/(.*)", "destination": "/api/index" }]
```

que conserva el path original, que es lo que FastAPI necesita para casar
`/api/health` y `/api/chat`. **No lo quites** pensando que sobra: sin él el
endpoint no existe desde fuera.

## Qué puede leer el agente

Dos repositorios, ambos de solo lectura:

| Repositorio | Para qué | Herramientas |
|---|---|---|
| `Evetev-Dev/brand` | manual, tokens, logos, mascota | `obtener_activo_github` |
| `EveTevSas/evetevbrain` | el código tal como está hoy | `leer_archivo_del_repo`, `listar_carpeta_del_repo` |

Lo segundo es lo que permite pedirle *"cámbiale el titular a la portada de
EvePay"*: lee `apps/evepay/index.html` y parte de ahí, en vez de generar una
página nueva desde cero. Puede listar carpetas antes de leer, para no adivinar
rutas.

### El token del código: no reutilices el de marca

Un token de alcance fino está **limitado a los recursos de una sola
organización**. El de marca pertenece a `Evetev-Dev` y el monorepo es de
`EveTevSas`, así que mandarlo no es neutro: **empeora las cosas**. Sin cabecera
de autorización GitHub sirve el repositorio público; con una credencial de otra
organización responde **403**. Pasó en producción.

Por eso `GITHUB_TOKEN_CODIGO` no tiene respaldo en `GITHUB_TOKEN`. Y por si
alguien la configura mal, una lectura que devuelva 401 o 403 se reintenta una
vez **sin credencial**. Si el repositorio fuera privado ese reintento da 404,
que sigue siendo un error visible: la red de seguridad no esconde un problema
de permisos.

**Puede quedar vacía, pero conviene ponerla.** Sin autenticar, GitHub permite
**60 peticiones por hora y por IP**, y las IP de salida de Vercel son
compartidas: el agente puede quedarse sin cuota por tráfico ajeno. Con un token
propio son 5 000 por hora.

El token correcto es uno de alcance fino con **dueño `EveTevSas`**, repositorio
`evetevbrain`, permiso *Contents: Read-only*. Se crea aparte del de marca —no se
puede ampliar el existente, porque un token no cruza organizaciones.

Los archivos que lee entran como **material de referencia, no como
instrucciones**; está dicho explícitamente en el prompt del sistema. Y las
lecturas se cortan a 60 000 caracteres avisando, para que un archivo grande no
deje al agente sin contexto para escribir.

## Usar la API

```bash
curl -X POST https://<tu-deploy>.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Agente-Token: $AGENTE_API_TOKEN" \
  -d '{"historial":[],"mensaje_nuevo":"Una tarjeta de precios con la marca Evetev"}'
```

Responde `{ "codigo_html": "...", "mensaje_crudo": "..." }`. La interfaz debe
inyectar `codigo_html` en el `srcdoc` de un `<iframe>` y **guardar el historial
en su propio estado**, reenviándolo en cada petición.

## Decisiones que conviene no deshacer sin pensarlo

**La memoria no vive en el servidor.** En Vercel el sistema de archivos es de
solo lectura salvo `/tmp`, y las funciones son efímeras: el JSON de historial se
perdería entre peticiones. Por eso el cliente manda el historial. Si más
adelante hace falta memoria compartida entre dispositivos, el paso natural es
Postgres (Supabase, que ya se usa) o Vercel KV — no el disco.

**El endpoint está autenticado y falla cerrado.** Cada llamada gasta créditos de
Moonshot y usa el `GITHUB_TOKEN`. Sin `AGENTE_API_TOKEN` configurado responde
`503` en vez de quedar abierto.

**Las versiones de `requirements.txt` no son arbitrarias.** `langchain-core`
exige `pydantic>=2.7.4`; fijar pydantic 2.5.x hace fallar la instalación.
`langchain-core` se deja sin fijar para que langgraph y langchain-openai
resuelvan una versión compatible entre sí.

**Ojo con el tamaño del bundle.** LangChain y LangGraph son pesados. El límite
de Vercel para Python es 500 MB descomprimido, así que debería entrar, pero si
el build se queja, la palanca es `excludeFiles` en `vercel.json`.

**La página es pública y se decidió que siga así, de momento.** En
`studio.evetev.com` cualquiera con la URL ve la interfaz. Se estudió cerrarla y
las opciones eran:

- *Deployment Protection* de Vercel. La modalidad **Standard Protection deja
  fuera los dominios personalizados de producción**, justo el que importa; para
  cubrirlo hace falta *All Deployments*, que exige Pro con Advanced Deployment
  Protection: **150 USD al mes**. Descartado por desproporcionado.
- *Cloudflare Access*, gratis hasta 50 personas, pero obliga a mover el DNS de
  `evetev.com` desde name.com, con los MX de Google Workspace y los registros de
  Resend de por medio. Riesgo sobre el correo de la empresa, no compensa.
- **Google Sign-In propio:** botón de Google en la página, y la función verifica
  la firma del token y que el correo sea del dominio. Gratis y encaja bien
  porque el backend ya autentica, solo cambiaría *qué* comprueba. **Es el camino
  cuando el token compartido se vuelva incómodo de repartir.**

Se mantiene el token porque protege lo único que cuesta dinero: sin él no se
puede generar. Lo expuesto es un formulario vacío.
