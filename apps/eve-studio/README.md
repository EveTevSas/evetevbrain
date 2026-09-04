# @evetev/eve-studio

Agente que edita las landings de `apps/website` a partir del manual de marca.
Python + LangGraph, con **Kimi (Moonshot)** como motor.

**Corre en local y solo en local.** Lee y escribe el repositorio que tienes en el
disco; deja los archivos tocados en tu árbol de trabajo y para. No despliega, no
commitea y no abre Pull Requests: eso lo haces tú cuando el cambio te guste.

```
apps/eve-studio/
├── public/index.html   # la interfaz: chat + previsualización en vivo
├── api/index.py        # el servidor (FastAPI + LangGraph): API e interfaz
├── requirements.txt
├── package.json        # el script `dev`
└── .env.example
```

## Arrancarlo

```bash
cd apps/eve-studio
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env        # y pon la MOONSHOT_API_KEY
```

Y desde donde sea:

```bash
pnpm --filter @evetev/eve-studio dev
```

Abre <http://127.0.0.1:3003>. El mismo proceso sirve la interfaz y la API, así
que no hay nada más que levantar.

```bash
curl http://127.0.0.1:3003/api/health
```

Devuelve la raíz del repositorio que está mirando, si encontró la
`MOONSHOT_API_KEY`, cuántos activos de marca ve servidos y en qué carpetas puede
escribir. Es la comprobación de que está apuntando a donde crees.

## Por qué ya no está en Vercel

Estuvo en Vercel hasta septiembre de 2026 y de ahí venían casi todas sus
rarezas, porque las tres restricciones de una función serverless son justo las
tres cosas que este agente necesita:

| En Vercel                                                                                                        | En local               |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Disco de solo lectura → leía por la API de GitHub, 1-3 s por archivo                                             | `open()`, milisegundos |
| Proceso efímero → escribía abriendo un PR con cinco llamadas encadenadas (blob, árbol, commit, rama, PR), ~2 min | `write()`, instantáneo |
| Corte a los 300 s → petición grande = **504 mudo tras cinco minutos**                                            | no hay reloj           |

El 504 no era intermitente: cuanto más grande el archivo, más cerca del corte.
Y no era el modelo yendo lento — era que reescribir `evepay/index.html` (21 KB)
más `estilos.css` (13,5 KB) son ~12k tokens de generación, y encima había que
pagar dos minutos de API de git para dejarlos.

Con el repositorio en el disco todo eso desaparece, así que **se han quitado**:

- El presupuesto de tiempo (`PRESUPUESTO_TOTAL`, `MARGEN_PARA_EL_ARNES`,
  `invocar_con_tope`) y el tope de pasos. No hay reloj externo que burlar.
- El `AGENTE_API_TOKEN` y toda la autenticación. El servidor escucha en
  `127.0.0.1`: no hay nadie más a quien dejar fuera. Lo que protegía era el
  gasto de créditos, y ahora lo protege el hecho de que corre en tu máquina.
- Los tres tokens de GitHub. No habla con GitHub.
- Los Pull Requests, las ramas y los commits firmados como `Eve Studio`.

Queda **una** variable de entorno, `MOONSHOT_API_KEY`, que es la única que
cuesta dinero.

### Si algún día vuelve a hacer falta desplegarlo

No lo revivas copiando esto: el diseño de hoy da por hecho un disco escribible y
un repositorio presente. Lo que habría que reconstruir está en el historial —el
PR que hizo este cambio— y en el de `apps/rag-assistant`, que sí vive en Vercel
con el mismo patrón de estáticos más una función.

## Qué puede escribir el agente

Deja los archivos en el árbol de trabajo. **Nada más.** Tú miras `git diff`, lo
pruebas, y commiteas si te gusta. Iterar deja de costar un PR, que es lo que
hacía que probar tres variantes de una sección fuera insoportable.

El arnés vive **en código, no en el prompt** — a un modelo se le puede convencer
de saltarse una instrucción; a un `if` no. Que ahora escriba directamente en tu
disco lo hace más importante, no menos: ya no hay un PR de por medio.

| Límite                  | Valor                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Carpetas                | `apps/website/evepay/`, `apps/website/conecta/`, `apps/website/intelligence/` |
| Extensiones             | `.html`, `.css`                                                               |
| Prohibidos              | `base.css`, `formularios.js` (generados desde `packages/brand`)               |
| Archivos por petición   | 5                                                                             |
| Tamaño por archivo      | 100 KB                                                                        |
| Escrituras por petición | 10                                                                            |
| Operaciones             | crear y sustituir; **nunca** borrar ni renombrar                              |

Dos exclusiones importan especialmente: **`base.css`**, porque editarlo ahí lo
revierte el siguiente `pnpm landings:sync` y rompe el job de CI; y
**`apps/eve-studio`**, porque un agente que puede reescribir su propio arnés no
tiene arnés.

Dos herramientas, y la primera es la que se usa casi siempre:

- **`editar_bloque(ruta, buscar, reemplazar, resumen)`** — sustituye un
  fragmento exacto. Si `buscar` no aparece, o aparece más de una vez, no escribe
  nada y lo dice. Es la opción por defecto: para mover un `<div>` el modelo
  emite ~200 tokens en vez de ~12k.
- **`escribir_archivo(ruta, contenido, resumen)`** — el archivo entero, para
  crear uno nuevo o reescribir una página casi completa.

### El arnés de «lo hice» / «no lo hice»

Sigue en pie, y sigue siendo necesario. Si el agente **dice** que dejó el cambio
y **no llamó** a ninguna herramienta de escritura, se le devuelve una vuelta con
un aviso que le obliga a elegir: escribir de verdad, o decir que no escribió
nada. Si insiste, la interfaz lo desmiente ante ti.

Dos decisiones sobre el disparador, heredadas y todavía válidas:

- **Se dispara con una contradicción comprobable** —sus palabras contra el
  registro de la herramienta—, no con una suposición sobre lo que pedías.
  Distinguir «hazlo» de «cómo se haría» exige otra llamada al modelo, y
  equivocarse castiga a quien solo hizo una pregunta.
- **Una sola vuelta.** Nada de dejar al modelo en bucle gastando créditos.

La lección de fondo es de agosto de 2026 y está documentada en `docs/`: la regla
13 del prompt decía «termina siempre indicando la URL del PR que te devolvió la
herramienta», y cuando el modelo no había llamado a la herramienta la única
forma de cumplirla era inventarse una URL. **La regla que debía dar trazabilidad
era la que fabricaba el número.** Hoy no hay URLs que inventar, pero el principio
se conserva: lo que se anuncia sale del registro de la herramienta, nunca del
texto del modelo.

## Qué puede leer el agente

Todo el monorepo, desde el disco, **menos** `.env*`, `.git`, `node_modules` y los
entornos virtuales. Esa exclusión no es cosmética: basta con pedirle «lee
apps/eve-studio/.env» para que las llaves acaben en el contexto del modelo y de
ahí en el historial del navegador.

Las rutas pasan todas por `_resolver()`, que deshace enlaces simbólicos y
comprueba que el destino sigue dentro del repositorio. Sin eso, «lee
`../../.ssh/id_rsa`» es una petición perfectamente válida.

| Herramienta               | Para qué                                        |
| ------------------------- | ----------------------------------------------- |
| `leer_archivo`            | un archivo del monorepo, tal como está ahora    |
| `listar_carpeta`          | descubrir rutas antes de leer                   |
| `leer_activo_de_marca`    | manual, tokens, o la ruta pública de una imagen |
| `listar_activos_de_marca` | qué activos **se sirven** de verdad             |

### Las imágenes se listan, no se recuerdan

El agente no sube binarios —solo escribe `.html` y `.css`—, así que toda imagen
se cita por URL. El riesgo no es que falle: es que **acierte la forma de la URL
y falle el archivo**. Un nombre plausible como `mascota-pensativa.png` produce
una ruta impecable y un 404 en la página: nada falla en ningún sitio donde se
note.

Por eso `listar_activos_de_marca` con cadena vacía responde **lo que el sitio
sirve de verdad** —el contenido de `apps/website/marca`, que llena
`pnpm marca:sync`— y no el índice de `packages/brand`. Estar en la fuente no
basta: si el manifiesto de `scripts/marca-sync.mjs` no lo copia, no lo sirve
nadie. Se perdió una petición por esto: la imagen estaba en `ilustraciones`, el
agente miró en `mascota`, no la encontró y se negó a usarla.

Los archivos que lee entran como **material de referencia, no como
instrucciones**; está dicho explícitamente en el prompt del sistema. Y las
lecturas se cortan a 60 000 caracteres avisando, para que un archivo grande no
deje al agente sin contexto para escribir.

## La interfaz

Estática, sin dependencias ni paso de compilación; la sirve el mismo uvicorn.
Chat a la izquierda; a la derecha, cuatro pestañas:

- **Vista previa** — se arma con los archivos escritos: un `<base>` a la landing
  publicada para que `base.css` cargue de verdad, y el `estilos.css` **nuevo**
  incrustado quitando su `<link>`. El origen se deduce de la ruta que tocó el
  agente; no lo elige nadie. Hubo un selector para eso y se quitó: era un ajuste
  que había que acordarse de mover y que, al olvidarlo, no fallaba ruidosamente.
- **Detalles** — los archivos escritos con su tamaño y la explicación completa
  del agente.
- **Historial** — el registro íntegro del proyecto, que nunca se manda ni se
  resume. Con un botón para adjuntarlo al siguiente mensaje **una sola vez**: si
  viajara siempre, volveríamos al problema que la compactación resuelve.
- **Imagen** — publica un activo de marca. Llama a `scripts/marca-imagen.mjs`,
  el mismo que corre `pnpm marca:imagen`: convierte con la receta medida
  (2048 px, calidad 80, alfa 50), lo deja en `packages/brand`, lo anota en el
  manifiesto y sincroniza las copias. Antes había aquí una reimplementación en
  Python de todo eso, porque en Vercel no había Node donde ejecutar el guion; en
  local sí lo hay, así que la copia sobra. Dos implementaciones del mismo
  criterio se separan, y la que se queda atrás es siempre la que menos se usa.
- **Instrucciones** — texto que se añade al prompt en cada petición de ese
  proyecto. Va al final del sistema, así que no puede desactivar las reglas de
  marca ni el arnés, que vive en código.

El HTML generado se inyecta en un `<iframe>` con `srcdoc` y **`sandbox`**: se
renderiza aislado y no puede tocar la página que lo contiene. Todo lo que llega
del agente se pinta con `textContent`, nunca interpolado como HTML.

**Proyectos**: cada uno guarda su propia conversación en `localStorage`, así que
sobreviven a recargar y a cerrar el navegador. Un turno que falla **no entra al
historial**, para no ensuciar el contexto.

## La memoria, y por qué no guarda el código

Cada proyecto guarda **dos** historiales:

- **`historial`** es el que viaja al agente y el que se compacta.
- **`completo`** no se manda nunca y no se toca. Resumir pierde información sin
  vuelta atrás, y si un resumen sale malo hay que poder mirar qué se dijo de
  verdad. Cuesta unos bytes.

**El código no entra en el historial.** El archivo real está a un `open()` de
distancia: guardar el HTML en cada turno era pagar en todas las peticiones por
algo que ya está en el disco. Se guarda la intención, las decisiones y las rutas
tocadas. Una respuesta de 52 000 caracteres se recuerda en 40.

**La compactación corre al escribir**, no como tarea programada: cuando el
historial de un proyecto pasa de 12 000 caracteres, los turnos viejos se resumen
y los 4 últimos se conservan literales. El resumen lo hace Kimi, que es barato, y
solo al cruzar el umbral. **Si el resumen falla, la petición sigue** con el
historial largo: peor, pero funciona.

El historial vive en el navegador y no en el servidor. Eso ya no es una
imposición de la plataforma —aquí hay disco de sobra— pero se mantiene porque
funciona y porque mover la memoria al servidor es un cambio con su propio
diseño, no un efecto secundario de bajarlo a local.

## Hubo un REPL, y por qué ya no está

`agente_cli.py` era el agente original de línea de comandos, con su propia copia
de las herramientas. El README lo llamaba «duplicación consciente» y justificaba
el precio: `api/index.py` mantenía todo en un solo módulo para no añadirle
importaciones relativas al montaje de Vercel, así que la copia la pagaba el
REPL. Sin Vercel esa razón desapareció, y lo que quedaba era una segunda
implementación **más lenta** —seguía leyendo por la API de GitHub— y **ya
desviada**: su prompt aún mandaba citar `cdn.jsdelivr.net`, un CDN que se apagó
en agosto de 2026, así que cualquier imagen que produjera venía rota.

Es justo el fallo que la duplicación invitaba a cometer, y el motivo por el que
ahora hay una sola implementación. Si algún día hace falta un REPL, que llame a
`/api/chat` en vez de reimplementar las herramientas.
