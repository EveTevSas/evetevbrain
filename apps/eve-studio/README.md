# @evetev/eve-studio

Agente que genera interfaces de usuario a partir del manual de marca. Python +
LangGraph, con **Kimi (Moonshot)** como motor. Lee, en solo lectura y desde
GitHub, el código de este monorepo y sus activos de marca —que viven en
`packages/brand` desde que se borró el repositorio `Evetev-Dev/brand`—, para
partir de lo que ya existe en vez de reescribirlo.

La constitución (§8) dice: _"Servicio de IA en Python: cuando aparezca, entra
como `apps/ai` en el mismo monorepo."_ Se respeta el fondo —vive en el monorepo,
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

Chat a la izquierda; a la derecha, cuatro pestañas:

- **Vista previa** — se arma con los archivos propuestos: un `<base>` a la
  landing publicada para que `base.css` cargue de verdad, y el `estilos.css`
  **nuevo** incrustado quitando su `<link>`, porque el publicado todavía no
  tiene los cambios del PR. El origen se deduce de la ruta que tocó el agente;
  no lo elige nadie. Hubo un selector para eso y se quitó: era un ajuste que
  había que acordarse de mover y que, al olvidarlo, no fallaba ruidosamente —
  solo se veía raro.
- **Detalles** — archivos propuestos con su tamaño, enlace al PR y la
  explicación completa del agente.
- **Historial** — el registro íntegro del proyecto, que nunca se manda ni se
  resume. Con un botón para adjuntarlo al siguiente mensaje **una sola vez**: si
  viajara siempre, volveríamos al problema que la compactación resuelve.
- **Instrucciones** — texto que se añade al prompt en cada petición de ese
  proyecto. Va al final del sistema, así que no puede desactivar las reglas de
  marca ni el arnés, que vive en código.

**La preview de Vercel no se puede incrustar:** responde 302 al SSO y manda
`X-Frame-Options: DENY`. Por eso va como enlace y no como iframe, y por eso la
vista previa se reconstruye aquí.

- El HTML generado se inyecta en un `<iframe>` con `srcdoc` y **`sandbox`**: se
  renderiza aislado y no puede tocar la página que lo contiene.
- **El token se pide una vez** y se guarda en `localStorage` del navegador. Sin
  él la API responde 401, así que la interfaz lo pide antes de dejar generar.
- **Proyectos**: cada uno guarda su propia conversación en `localStorage`, así
  que sobreviven a recargar y a cerrar el navegador. No sobreviven a cambiar de
  equipo ni los ve otra persona; cuando eso estorbe, el paso siguiente es
  Postgres —un proyecto de Supabase **aparte**, porque el de EveConecta declara
  en su README que pertenece en exclusiva a esa vertical.
- Un turno que falla **no entra al historial**, para no ensuciar el contexto.

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
_Settings → General_:

- **Root Directory:** `apps/eve-studio`

En _Settings → Environment Variables_ (nunca en el repo, §4):

| Variable                 | Para qué                                         |
| ------------------------ | ------------------------------------------------ |
| `MOONSHOT_API_KEY`       | motor del agente                                 |
| `GITHUB_TOKEN`           | leer los activos de marca (solo lectura)         |
| `GITHUB_TOKEN_CODIGO`    | leer el monorepo — **opcional hoy**, ver abajo   |
| `GITHUB_TOKEN_ESCRITURA` | abrir PRs — **no la pongas sin proteger `main`** |
| `AGENTE_API_TOKEN`       | protege el endpoint — `openssl rand -hex 32`     |

### Verificar el primer despliegue

El enrutado de una app ASGI en Vercel es el punto más delicado de este montaje,
así que **compruébalo antes de dar por bueno el deploy**:

```bash
curl https://<tu-deploy>.vercel.app/api/health
```

Debe devolver un JSON con `"ok": true` y los flags de configuración.

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

### Saber qué token cargó el servidor

El panel de Vercel **no muestra el valor de una variable marcada Sensitive**, así
que después de cambiarla no hay forma de confirmar desde ahí qué quedó guardado.
Para eso están estos dos:

```bash
curl https://studio.evetev.com/api/health
```

Devuelve, por cada token, si está presente, de qué **tipo** —`alcance-fino` para
los `github_pat_`, `clasico` para los `ghp_`— y su **longitud**. Con eso se sabe
si el valor que se acaba de pegar es el que está corriendo, sin revelar ni un
carácter del secreto. Incluye `puede_abrir_prs`, que responde de un vistazo si
el agente va a dejar el cambio en el repositorio o a entregarlo por el chat.

```bash
curl -H "X-Agente-Token: $AGENTE_API_TOKEN" https://studio.evetev.com/api/diagnostico
```

Este hace **lecturas de verdad** contra los dos repositorios y reporta el código
que devuelve GitHub con credencial y sin ella. Y comprueba el permiso de
escritura leyendo `permissions` del repositorio, **sin escribir nada**: crear una
rama de prueba ensuciaría el repositorio y, con el arnés, ni siquiera podría
borrarla después. Es el que dice si el token
_funciona_, no solo si está puesto. Va aparte del health porque gasta cuota, y
pide token porque revela con qué credencial funciona cada repositorio.

## Lo que genera encaja en el repositorio

Cuando le pides una landing del monorepo, el agente **no** devuelve una página
autocontenida: devuelve el `index.html` tal como tiene que quedar.

- Lee primero el archivo real y respeta su cabecera: favicon, tipografías,
  tokens del CDN y el `<meta name="robots" content="noindex">`.
- **Enlaza** `base.css` y `estilos.css` en vez de incrustar el armazón. `base.css`
  es generado desde `packages/brand/landing/base.css` y no debe reescribirse.
- El CSS propio va en **`estilos.css`, como un archivo más de la propuesta**:
  el agente lo lee entero, le añade sus reglas y lo devuelve completo. La
  herramienta sustituye archivos, no aplica parches.
- El color de producto va en el marcado con `--p`, no fijado en CSS.

Sin esto, pegar la salida del agente sobre `index.html` dejaba huérfanos
`base.css` y `estilos.css` —rompiendo el armazón compartido en esa landing— y se
llevaba por delante el `noindex`.

## La memoria, y por qué no guarda el código

Cada proyecto guarda **dos** historiales:

- **`historial`** es el que viaja al agente y el que se compacta.
- **`completo`** no se manda nunca y no se toca. Resumir pierde información sin
  vuelta atrás, y si un resumen sale malo hay que poder mirar qué se dijo de
  verdad. Cuesta unos bytes.

**El código no entra en el historial.** Ahora que el agente lee el repositorio,
el archivo real está siempre a una llamada de distancia: guardar el HTML en cada
turno era pagar en todas las peticiones por algo que ya está en git. Se guarda la
intención, las decisiones y el PR. Una respuesta de 52 000 caracteres se recuerda
en 40.

**La compactación corre al escribir**, no como tarea programada: cuando el
historial de un proyecto pasa de 12 000 caracteres, los turnos viejos se resumen
y los 4 últimos se conservan literales. Se hizo así porque es más simple, siempre
está al día, y no depende de un cron —que en Hobby además va limitado a una vez
al día.

El resumen lo hace **Kimi**, que es barato, y solo al cruzar el umbral: sale más
a cuenta que reenviar un historial gordo en cada turno. Conserva intenciones,
decisiones, lo descartado con su porqué, rutas y PRs; descarta pasos intermedios
y código superado. **Si el resumen falla, la petición sigue** con el historial
largo: peor, pero funciona.

## Qué puede escribir el agente

Abre **Pull Requests**; nunca escribe en `main`. Cada PR trae su preview de
Vercel, que es la landing real funcionando: revisar deja de ser leer un diff.

El arnés vive **en código, no en el prompt** — a un modelo se le puede convencer
de saltarse una instrucción; a un `if` no:

| Límite                  | Valor                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Carpetas                | `apps/website/evepay/`, `apps/website/conecta/`, `apps/website/intelligence/` |
| Extensiones             | `.html`, `.css`                                                               |
| Prohibidos              | `base.css` (generado desde `packages/brand`)                                  |
| Archivos por PR         | 5                                                                             |
| Tamaño por archivo      | 100 KB                                                                        |
| Propuestas por petición | 3                                                                             |
| Operaciones             | crear y actualizar; **nunca** borrar ni renombrar                             |

Dos exclusiones importan especialmente: **`base.css`**, porque editarlo ahí lo
revierte el siguiente `pnpm landings:sync` y rompe el job de CI; y **`apps/eve-studio`**,
porque un agente que puede reescribir su propio arnés no tiene arnés.

Una propuesta con cualquier ruta inválida **se rechaza entera**: aplicar solo la
parte válida dejaría el repositorio en un estado que nadie pidió.

Los commits van firmados como `Eve Studio <eve@evetev.com>`, para que dentro de
seis meses se distinga de un vistazo quién escribió qué. Si la rama ya existe,
añade commits en vez de abrir otro PR.

**La URL del PR sale de la herramienta, no del texto del agente.** Parece obvio y
no lo era: durante un tiempo se extraía de la respuesta redactada por el modelo
con una expresión regular. Abrió el PR #45, escribió «#47» en su prosa, y la
interfaz enlazó a un 404 — el cambio estaba hecho, pero parecía que había
fallado. Ahora `proponer_cambios` apunta la URL que le devolvió GitHub en el
mismo `registro` donde ya guardaba los archivos, y si el agente escribió otro
número en su texto se corrige antes de enseñarlo: de nada sirve que el enlace
esté bien si el número que se lee en el chat sigue mintiendo.

**Y el respaldo por expresión regular se quitó, porque era el agujero que
quedaba.** El arreglo de arriba solo cubría el caso en que la herramienta SÍ
había abierto un PR. Cuando no abría ninguno, el código volvía a leer la URL del
texto del modelo — y el 17 de agosto el agente escribió `/pull/58`, un PR que
nunca existió: no llegó ni a crear la rama. La interfaz lo enlazó igual, con su
«Abrí un Pull Request con el cambio». Aquel respaldo estaba pensado para cuando
no hay credencial de escritura y el PR lo abrió una persona, pero ese caso no
compensa: **un enlace roto es peor que no tener enlace, porque parece que la
operación salió bien.**

Hoy, si la herramienta no devolvió PR, no hay PR:

- las URLs de `/pull/` que el modelo se haya inventado **se tachan** del texto
  antes de enseñarlo;
- la respuesta lleva un `aviso` que lo dice sin rodeos, y la interfaz lo pinta
  como error debajo del resumen;
- viaja un `pr_verificado` aparte de `pr_url`, y **solo lo verificado anuncia un
  PR**. Hoy es redundante —`pr_url` ya solo puede venir de la herramienta—, pero
  la interfaz es un desplegable distinto del API y no debería tener que deducir
  la procedencia de una URL: eso es justo lo que falló.

Los fallos de la herramienta se apuntan además en `registro["fallos"]`, que el
modelo no puede tocar. Lo que la herramienta _devuelve_ lo lee el modelo y puede
reinterpretarlo; lo que apunta en el registro es lo que permite desmentirlo.

Tres avisos distintos, porque no significan lo mismo: que la herramienta falle es
un problema del sistema, que el agente se invente un PR es un problema del
agente, y que no llame a la herramienta puede ser lo correcto —una respuesta que
no cambia archivos no tiene por qué abrir nada— y por eso ese caso no avisa.

### Por qué no llamaba a la herramienta

Lo de arriba hace **visible** el fallo. La causa se encontró después, en los logs
de Vercel, comparando las dos peticiones de aquella tarde:

|                      | la que abrió el PR #57 | la que mintió |
| -------------------- | ---------------------- | ------------- |
| duración             | 3 m 30 s               | 36,5 s        |
| llamadas al modelo   | 6                      | 3             |
| hueco entre llamadas | **2 m 02 s**           | 4 s y 15 s    |

Las llamadas a GitHub no salen en el log, pero su duración sí deja huella:
`proponer_cambios` tarda unos dos minutos —blobs, árbol, commit, rama, PR— y el
#57 se creó dentro de ese hueco. En la petición que falló no hay ningún hueco.
Ni error de GitHub, ni timeout, ni tope de propuestas: **el modelo no llamó a la
herramienta y contó el resultado igualmente**.

Lo que lo empujaba estaba en el propio prompt. La regla 13 decía:

> «Termina siempre indicando la URL del PR que te devolvió la herramienta.»

Cuando el modelo no había llamado a la herramienta, la única forma de cumplir esa
instrucción era inventarse una URL. **La regla que debía dar trazabilidad era la
que fabricaba el número.** Ahora dice lo contrario: no escribas ninguna URL de PR
—el sistema pone el enlace— y di con todas las letras si dejaste o no el cambio.

### El arnés

Un prompt se puede desobedecer, así que además hay una comprobación en código: si
el agente **dice** que dejó el cambio y la herramienta **no corrió**, se le
devuelve una vuelta con un aviso que le obliga a elegir —llamar a
`proponer_cambios`, o decir que no propuso nada—.

Dos decisiones sobre el disparador:

- **Se dispara con una contradicción comprobable**, sus palabras contra el
  registro de la herramienta. Se pensó al revés —disparar cuando la petición
  «pedía un cambio»— y no vale: distinguir «hazlo» de «cómo se haría» exige otra
  llamada al modelo, y equivocarse castiga con dos minutos de espera a quien solo
  hizo una pregunta. Una respuesta que explica una opción sin afirmar nada no
  dispara nada. Probado con «para dejarlo guardado tendría que abrir un Pull
  Request, ¿lo hago?», que no dispara.
- **Una sola vuelta.** Si insiste, el aviso se lo dice a la persona con otras
  palabras («se le avisó y sigue sin haber ningún PR»). Lo que no se hace es
  dejar al modelo en bucle gastando créditos hasta que acierte.

**Requisitos antes de darle el token:**

1. **Protección de rama en `main`.** El código dice «nunca escribas en main»,
   pero un token con permiso de escritura _puede_ si hay un fallo. La protección
   lo vuelve imposible desde la plataforma, que es donde debe estar la última
   línea. Exige el check **«CI completo»** y ningún otro.
2. **`GITHUB_TOKEN_ESCRITURA`**: alcance fino, dueño `EveTevSas`, solo
   `evetevbrain`, con _Contents: Read and write_ y _Pull requests: Read and
   write_. Separado de los de lectura: si se filtra, se revoca solo ese.

Sin la variable configurada la herramienta responde que no hay credencial y el
agente entrega el código por el chat, como antes.

## Qué puede leer el agente

Dos repositorios, ambos de solo lectura:

| Repositorio             | Para qué                       | Herramientas                                       |
| ----------------------- | ------------------------------ | -------------------------------------------------- |
| `packages/brand/`       | manual, tokens, logos, mascota | `obtener_activo_github`, `listar_carpeta_de_marca` |
| `EveTevSas/evetevbrain` | el código tal como está hoy    | `leer_archivo_del_repo`, `listar_carpeta_del_repo` |

### Las imágenes se listan, no se recuerdan

El agente no puede subir binarios —solo escribe `.html` y `.css`—, así que toda
imagen se cita por URL. El riesgo ahí no es que falle: es que **acierte la forma
de la URL y falle el archivo**. Cuando esto se escribió, el monorepo tenía 23
poses de la mascota y el repo de marca solo servía 2, así que un nombre
plausible como `mascota-pensativa.png` producía una URL bien formada y un 404 en
la página: nada fallaba en ningún sitio donde se notara.

Por eso hay dos redes, y las dos hacen falta:

- **`listar_carpeta_de_marca`**, para que elija de lo que existe en vez de
  deducir el nombre. Es la misma herramienta que ya tenía para el monorepo; que
  la marca no la tuviera era el hueco.
- **`obtener_activo_github` comprueba que la imagen existe** antes de devolver
  su URL. Listar es una instrucción y a una instrucción se le puede dar
  esquinazo; esto es un `if`.

Y devuelve una URL **del CDN**, no de `raw.githubusercontent`. Esto no es
cosmético: la landing de EveConecta se mezcló con un `<img>` apuntando a `raw`
—porque es lo que la herramienta entregaba— y eso contradice la regla T1 del
manual, no tiene caché de borde y sigue a `main`, así que la imagen se rompe
sola el día que el archivo se mueva. Es la misma avería que ya arregló 0483337.

La comprobación se hace **contra el CDN**, no contra la API de GitHub, porque es
la URL que va a acabar en la página. Un archivo puede estar en `main` y no en la
última versión etiquetada: pasó con `v1.3.0`, etiquetada antes de mezclar su PR,
que dejó a `@1` sirviendo el árbol viejo. Preguntarle a GitHub habría respondido
que sí mientras el navegador recibía un 404.

`agente_cli.py` **repite las dos herramientas** en vez de importarlas. Es
duplicación consciente: `api/index.py` mantiene todo en un módulo para no
añadirle importaciones relativas al montaje de Vercel, que ya dio problemas. El
precio lo paga la copia, así que un cambio en el criterio de URLs o en la
validación hay que hacerlo en los dos sitios. Es lo que se olvidó la primera vez
y dejó el REPL entregando URLs de `raw` cuando la API ya no lo hacía.

Ese desfase ya no puede volver: **no hay dos repositorios**. Al borrarse
`Evetev-Dev/brand`, sus activos pasaron a `packages/brand` —incluidas las 22
poses en WebP, que solo estaban allí— y el agente lee de ahí. Lo que sí hay que
vigilar es otra cosa: un activo puede estar en `packages/brand` y no servirse,
porque quien lo sirve es la carpeta `/marca` de cada app, que llena
`pnpm marca:sync` desde un manifiesto. Por eso `obtener_activo_github` comprueba
contra `apps/website/marca` y no contra la fuente.
Cada activo nuevo hay que publicarlo a mano y etiquetar una `v1.x`; hasta que
eso pase, el agente dirá que no está, que es lo correcto, en vez de enlazarlo
roto.

Lo segundo es lo que permite pedirle _"cámbiale el titular a la portada de
EvePay"_: lee `apps/website/evepay/index.html` y parte de ahí, en vez de generar una
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
`evetevbrain`, permiso _Contents: Read-only_. Se crea aparte del de marca —no se
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

- _Deployment Protection_ de Vercel. La modalidad **Standard Protection deja
  fuera los dominios personalizados de producción**, justo el que importa; para
  cubrirlo hace falta _All Deployments_, que exige Pro con Advanced Deployment
  Protection: **150 USD al mes**. Descartado por desproporcionado.
- _Cloudflare Access_, gratis hasta 50 personas, pero obliga a mover el DNS de
  `evetev.com` desde name.com, con los MX de Google Workspace y los registros de
  Resend de por medio. Riesgo sobre el correo de la empresa, no compensa.
- **Google Sign-In propio:** botón de Google en la página, y la función verifica
  la firma del token y que el correo sea del dominio. Gratis y encaja bien
  porque el backend ya autentica, solo cambiaría _qué_ comprueba. **Es el camino
  cuando el token compartido se vuelva incómodo de repartir.**

Se mantiene el token porque protege lo único que cuesta dinero: sin él no se
puede generar. Lo expuesto es un formulario vacío.
