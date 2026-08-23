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

```bash
cp apps/eve-store/.env.example apps/eve-store/.env.local
# y se rellenan los valores desde el panel de Supabase o desde Vercel
```

El proyecto de Supabase es el mismo que usa EveConecta —`jmwiydbyngqbaieheeeh`,
declarado en `apps/eveconecta/supabase/config.toml`—, con un schema aparte. Los
valores salen de **Supabase → Project Settings → API** y de **Database → Connection
string**; si ya están en Vercel, `vercel env pull apps/eve-store/.env.local` los
baja sin teclearlos.

Después:

```bash
pnpm --filter @evetev/eve-store db:migrar     # crea el schema `tienda`
pnpm --filter @evetev/eve-store db:importar   # carga los 25 productos
pnpm --filter @evetev/eve-store db:comprobar  # confronta base y aplicación
```

## Qué hay hoy

|                                |                                                               |
| ------------------------------ | ------------------------------------------------------------- |
| `catalogo/`                    | La importación de Mercado Libre. **Artefacto, ya no fuente.** |
| `db/0001_tienda.sql`           | El schema. Es la fuente de verdad del modelo.                 |
| `db/schema.ts`                 | El mismo schema en Drizzle, para darle tipos a la app.        |
| `scripts/importar.mjs`         | Carga el JSON en la base. Idempotente.                        |
| `scripts/comprobar-schema.mjs` | Falla si la base y la aplicación se separan.                  |

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
cuadra. `db:comprobar` falla si alguien cambia el tipo a `numeric`.

**La regla de publicación vive en la base.** Un producto con avisos bloqueantes
sin resolver no se puede publicar; lo impide un disparador. `db:comprobar` no
lee el catálogo del sistema para verificarlo: **intenta publicar de verdad** un
producto bloqueado, dentro de una transacción que deshace. Una regla comprobada
solo el día que se escribió puede desaparecer en una migración futura sin que
nada se ponga en rojo.

## Estado

**24 de 25 productos están bloqueados** por 43 avisos pendientes: descripciones
sin confirmar, contenido ausente, GTIN en conflicto. No es un defecto del
import — es la cola de trabajo que el panel de administración existe para
resolver, y su pantalla de inicio.
