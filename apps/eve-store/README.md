# Eve-Store

La tienda propia de Evetev y el primer caso del servicio de comercio electrónico
legible por agentes. Ver [el plan](../../docs/PLAN_EVE_STORE.md).

Es una **vertical completa**: tiene su propio backend de dominio y su propio
schema. Cuando necesite cobrar hablará con EvePay **por HTTP**, nunca importando
su módulo — la regla existe para no destruir el dogfooding.

## Puesta en marcha

Las credenciales **no están en el repo y no deben pasar por un chat**: quedarían
escritas en la transcripción. Se ponen a mano en `apps/eve-store/.env.local`,
que `.gitignore` ya cubre (`.env.*`).

El archivo lleva tres marcadores `PEGA_AQUI_…` y, encima de cada uno, de dónde
sale su valor. En corto:

| Variable                               | Dónde está en Supabase                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | Botón **Connect** (arriba a la derecha) → **Direct connection** u **ORMs**. Hay que sustituir `[YOUR-PASSWORD]` por la contraseña de la base. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Project Settings → API Keys**, la llave `publishable`. Es pública por diseño: viaja al navegador.                                           |
| `SUPABASE_SECRET_KEY`                  | Misma pantalla, la llave `secret`. Hay que pulsar **Reveal**. Da acceso total saltándose las reglas de seguridad.                             |

**La contraseña de la base no se puede consultar**: solo se muestra al crear el
proyecto. Si no la tienes, se genera otra en _Project Settings → Database →
Reset database password_, y hay que actualizarla donde ya estuviera en uso.

Para saber si quedó bien, sin enseñarle las llaves a nadie:

```bash
pnpm --filter @evetev/eve-store creds
```

Comprueba el formato, avisa si las dos llaves están cambiadas entre sí o si
quedó el `[YOUR-PASSWORD]` sin sustituir, y termina conectándose de verdad. No
imprime ni un carácter de ninguna llave.

Después:

```bash
export DATABASE_URL="…"                     # solo para db:migrate — ver abajo
pnpm --filter @evetev/eve-store db:migrate  # crea el schema `tienda`
pnpm --filter @evetev/eve-store db:import   # carga los 25 productos
pnpm --filter @evetev/eve-store db:check    # confronta base y aplicación
pnpm --filter @evetev/eve-store dev         # arranca en el puerto 3006; el panel está en /panel
```

`db:import`, `db:check` y `dev` leen `.env.local` solos. **`db:migrate` no**:
es un bucle de `psql`, no un script de Node, y `psql` no sabe nada de ese
archivo. Hasta que la migración deje de ser un bucle de shell, esa línea hay que
exportarla a mano.

> Los tres comandos de Node **no** lo leían tampoco: `db:check` y `db:import`
> daban por hecho que la variable venía exportada y fallaban con «Falta
> DATABASE_URL» aunque `creds` dijera que todo estaba bien. Ahora la cargan con
> `scripts/entorno.mjs`, que no pisa lo que ya venga puesto en la terminal.

## La tienda está cerrada al público

**Cerrada por defecto.** Sin `TIENDA_ABIERTA=1`, todo lo público —portada,
fichas, marcas, búsqueda, carrito, checkout— es el letrero de
`/en-construccion`, con `noindex, nofollow`; el `robots.txt` prohíbe todo, el
sitemap va vacío y el feed responde 404. `/panel` sigue funcionando: la tienda
está cerrada al público, no a quien la está montando.

```bash
TIENDA_ABIERTA=1 pnpm --filter @evetev/eve-store dev   # verla como la vería un cliente
```

El sentido por defecto es deliberado. Una variable que se olvida deja la tienda
**cerrada**, no abierta: el fallo posible es que siga en obras más tiempo del
debido —se nota y se arregla en un minuto— y no que un catálogo a medio revisar
salga a la venta sin que nadie lo decida. Es la misma disciplina del schema,
`publicado boolean not null default false`.

La puerta vive en `middleware.ts` y no en cada página, para que una página nueva
no pueda saltársela por descuido.

> **Esto no es una cerradura**, es un letrero: el código y las rutas siguen
> respondiendo. Para que no llegue ni una petición hay que activar **Deployment
> Protection** en el proyecto de Vercel, que es un ajuste del panel, no del
> repositorio.

## Trabajar la tienda sin base de datos

Para tocar diseño no hace falta Supabase. Con la variable puesta, el catálogo
sale de `catalogo/catalogo.json` —los veinticinco productos que ya están en el
repo— y la tienda se pinta entera:

```bash
TIENDA_FIXTURE=1 pnpm --filter @evetev/eve-store dev
```

**No es un respaldo.** No se enciende solo ni salta cuando la base falla: hay
que pedirlo. Un respaldo automático haría que una base caída se viera igual que
una sana, y en una tienda eso es vender lo que no hay. Puesto en el entorno de
producción de Vercel, el arranque falla a propósito.

Lo que el fixture **no** reproduce, y conviene saber antes de fiarse de una
pantalla:

| No reproduce               | Por qué                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publicado`                | El JSON es el volcado **anterior** a la revisión: los 25 traen avisos por confirmar y con la regla real no saldría ninguno. Aquí se ven todos — uno más que en vivo. |
| Carrito y checkout         | `lib/carrito.ts` consulta la tabla por su cuenta y las acciones escriben. Siguen necesitando base.                                                                   |
| El orden de los resultados | Postgres lo calcula con `ts_rank`; el fixture filtra por palabras y conserva el orden del catálogo.                                                                  |

El detalle, en `lib/fixture.ts`.

## Qué hay hoy

|                                |                                                               |
| ------------------------------ | ------------------------------------------------------------- |
| `catalogo/`                    | La importación de Mercado Libre. **Artefacto, ya no fuente.** |
| `db/0001_tienda.sql`           | El schema. Es la fuente de verdad del modelo.                 |
| `db/schema.ts`                 | El mismo schema en Drizzle, para darle tipos a la app.        |
| `scripts/importar.mjs`         | Carga el JSON en la base. Idempotente.                        |
| `scripts/comprobar-schema.mjs` | Falla si la base y la aplicación se separan.                  |
| `app/page.tsx`                 | La portada: presentación y rejilla del catálogo publicado.    |
| `app/panel/`                   | El panel de administración, tras autenticación.               |
| `app/producto/[slug]/`         | La ficha pública, con su JSON-LD `Product` + `Offer`.         |
| `app/buscar/`                  | Búsqueda en español, sin tildes.                              |
| `app/cabecera.tsx`             | Promesa, marca, buscador, carrito y navegación por marcas.    |
| `lib/fixture.ts`               | El catálogo de mentira para trabajar sin base (ver arriba).   |
| `app/feed.xml/`                | El feed de producto para los canales de compra.               |

## Encontrable

**La búsqueda ignora las tildes, o no sirve.** Nadie teclea «Ácido
Hialurónico»: teclea «acido hialuronico», y con la configuración `spanish` a
secas esa consulta no encuentra nada. `db/0004_busqueda.sql` compone una
configuración propia que pasa `unaccent` antes del lematizador español.
Comprobado: «pestañas» y «pestanas» devuelven lo mismo, y «ACEITES» encuentra
trece productos por el lematizador.

El vector es una **columna generada**, no un disparador: así no hay forma de que
quede desincronizado del producto cuando aparezca una ruta de escritura nueva.
Los pesos ordenan la relevancia — nombre y marca en A, contenido y atributos en
B, descripción en C.

**El feed es la apuesta central**, y conviene recordar por qué: en 2026 hay tres
protocolos agénticos y ninguno está estabilizado —OpenAI apagó Instant Checkout
en marzo—. Construir contra un cliente concreto es apostar a un canal que puede
cerrarse; lo que los tres consumen es un feed exacto y fresco.

Se genera contra la base en cada petición, así que **el retraso es cero** y la
ventana de quince minutos que exige el canal se cumple por construcción. No hay
copia intermedia que pueda quedarse vieja, y una copia vieja es peor que no
tener feed: el canal aprende a desconfiar.

**`robots.txt` y `sitemap.xml` se generan del dato.** Con el catálogo vacío el
sitio se cierra entero; en cuanto hay un producto publicado se abre solo, con el
sitemap enlazado. Las páginas de resultados van `noindex, follow`: generan
infinitas URL casi idénticas que compiten con las fichas, que son las que
queremos que se citen.

## Quién puede entrar

El panel exige sesión **y** estar en `tienda.administrador`. Son dos cosas
distintas y hace falta comprobar las dos, porque **`auth.users` es compartido
con EveConecta**: en esta misma base hay tres residentes de conjuntos
residenciales. Si el panel se conformara con «¿inició sesión?», un residente
podría entrar a cambiar los precios de la tienda.

La comprobación está repartida en dos capas por una razón práctica:

- **El middleware** exige sesión. Corre en el borde, sin conexión a Postgres, así
  que no puede consultar la lista de acceso.
- **El layout de `/panel`** exige ser administrador. Sí tiene base de datos, y
  al envolver todas las páginas del grupo, **una página nueva nace protegida**
  sin que nadie tenga que acordarse.

No se usa RLS, y no es un olvido: el panel se conecta como `postgres`, dueño de
las tablas, así que se salta las políticas de fila. Una RLS aquí daría una
sensación de seguridad que no se sostiene.

Para dar acceso a alguien más:

```sql
insert into tienda.administrador (usuario_id, correo)
select id, email from auth.users where email = 'quien@evetev.com';
```

## Tres cosas que conviene no deshacer

**El import no pisa el trabajo del panel.** Volver a correrlo refresca lo que
viene del origen —nombre, precio, existencias, imagen— y **no toca `publicado`
ni los avisos ya resueltos**. Comprobado: tras publicar un producto y resolver
sus avisos, una reimportación completa lo deja publicado, con cero avisos
pendientes y sin duplicar ninguno.

**El precio es un entero en la unidad mínima**, igual que `montoMinor` en
EvePay. Para COP la unidad mínima es el valor face: `52000` son $52.000.
Guardarlo como pesos×100 mandaría a EvePay pedidos cien veces mayores, y ese
error no lo atrapa ninguna prueba de la tienda porque dentro de la tienda todo
cuadra. `db:check` falla si alguien cambia el tipo a `numeric`.

**La regla de publicación vive en la base.** Un producto con avisos bloqueantes
sin resolver no se puede publicar; lo impide un disparador. `db:check` no
lee el catálogo del sistema para verificarlo: **intenta publicar de verdad** un
producto bloqueado, dentro de una transacción que deshace. Una regla comprobada
solo el día que se escribió puede desaparecer en una migración futura sin que
nada se ponga en rojo.

## Estado

**Los 25 productos están bloqueados** por 78 avisos pendientes: 33 los deduce la
base del propio dato —descripción corta o sin confirmar, sin contenido, sin
GTIN, sin imagen— y se retiran solos al arreglarlo; los otros 45 vienen del
origen y necesitan una decisión. No es un defecto del import: es la cola de
trabajo que el panel existe para resolver, y su pantalla de inicio.

Desplegado en <https://eve-store-one.vercel.app> — la raíz es pública y `/panel`
pide sesión.

**El despliegue es automático desde `main`.** El proyecto de Vercel está
conectado al repositorio con Root Directory en `apps/eve-store`, y el
`ignoreCommand` del `vercel.json` hace que solo compile cuando cambia algo de
esta carpeta. Sin esa condición, cada cambio del monorepo dispararía un
despliegue y el límite de 100 por 24 horas del plan Hobby se agota en una tarde
— ya nos frenó dos veces.

Para desplegar a mano, si hiciera falta:
`npx vercel deploy --prod --yes` desde esta carpeta.
