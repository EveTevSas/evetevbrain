# @evetev/ai

Agente que genera interfaces de usuario a partir del manual de marca. Python +
LangGraph, con **Kimi (Moonshot)** como motor y una herramienta que lee los
activos de marca directamente del repositorio `Evetev-Dev/brand` en GitHub.

Ubicación decidida por la constitución (§8): *"Servicio de IA en Python: cuando
aparezca, entra como `apps/ai` en el mismo monorepo."*

```
apps/ai/
├── api/index.py        # backend HTTP (FastAPI + LangGraph) — lo que despliega Vercel
├── agente_cli.py       # el REPL original, para usarlo en local
├── requirements.txt    # en la raíz: Vercel detecta dependencias desde aquí
├── vercel.json
├── package.json        # scripts no-op: formaliza la app en el workspace de pnpm
└── .env.example
```

## Correr en local

```bash
cd apps/ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # y completa las tres llaves
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

- **Root Directory:** `apps/ai`

En *Settings → Environment Variables* (nunca en el repo, §4):

| Variable | Para qué |
|---|---|
| `MOONSHOT_API_KEY` | motor del agente |
| `GITHUB_TOKEN` | leer los activos de marca (solo lectura) |
| `AGENTE_API_TOKEN` | protege el endpoint — `openssl rand -hex 32` |

### Verificar el primer despliegue

El enrutado de una app ASGI en Vercel es el punto más delicado de este montaje,
así que **compruébalo antes de dar por bueno el deploy**:

```bash
curl https://<tu-deploy>.vercel.app/api/health
```

Debe devolver un JSON con `"ok": true` y los tres flags de configuración. Si
devuelve **404**, el path no está llegando a FastAPI: añade en `vercel.json`

```json
"rewrites": [{ "source": "/api/(.*)", "destination": "/api/index" }]
```

y vuelve a probar. No se incluye por defecto porque Vercel detecta el
entrypoint ASGI automáticamente y un rewrite mal puesto cambia el path que ve
FastAPI, que es la causa habitual del 404.

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

## Pendiente

La **interfaz gráfica** (chat + `<iframe>` de previsualización) todavía no está.
Cuando se haga, decidir dónde: servir estáticos y una función Python en el mismo
proyecto de Vercel no es el camino directo — la documentación apunta a
*Services*, o a un segundo proyecto para la UI.
