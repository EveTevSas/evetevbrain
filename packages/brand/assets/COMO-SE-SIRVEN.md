# Cómo llega un activo de marca a una página

Sustituye a `PUBLICAR.md`, que explicaba cómo publicar esta carpeta como
repositorio público servido por jsDelivr. **Ese repositorio —`Evetev-Dev/brand`—
se borró en agosto de 2026** y con él su ritual de etiquetar versiones y purgar
el CDN.

## El camino, hoy

```
packages/brand/assets/…     la fuente. Aquí se edita y se añade.
        │
        │  pnpm marca:sync   (manifiesto en scripts/marca-sync.mjs)
        ▼
apps/<app>/…/marca/…        la copia que se despliega con la app
        │
        ▼
/marca/<archivo>            lo que escribe el HTML
```

Cada app sirve su marca desde su propio origen. Ninguna depende del despliegue
de otra ni de un tercero: si una se cae, se cae sola.

## Añadir una imagen (lo normal)

```
pnpm marca:imagen ~/Descargas/escena.png --app website --nombre pasarela-de-pago
```

Analiza la fuente, la convierte a WebP con la receta medida —2048 px, calidad
80, alfa 50—, la deja en `packages/brand/`, **la anota en el manifiesto**,
sincroniza las copias y te imprime la ruta `/marca/<archivo>` lista para pasarle
a Eve Studio. Añade un `--app` por cada app que la vaya a servir; con `--seco`
solo convierte y no toca el repositorio.

No amplía una fuente pequeña, no acepta SVG —esos van a mano— y **no deja pisar
un archivo que ya existe** sin `--reemplazar`: si el contenido cambia pero la
URL no, ningún navegador que ya la tenga se entera, y lo que se ve es la imagen
vieja con el CSS nuevo. Para reemplazar, nombre nuevo.

Falta subir el resultado: la imagen, el manifiesto y las copias van en el mismo
commit.

## Añadir un activo a mano

1. Ponlo en la carpeta que le toque de `packages/brand/assets/` (o de
   `packages/brand/ilustraciones/`, que van aparte por peso).
2. Añádelo en `scripts/marca-sync.mjs`, en la lista de la app que lo va a usar.
   **Este paso no es opcional**: sin él el archivo está en el repositorio y no
   lo sirve nadie, y la página da un 404 con la ruta bien escrita.
3. `pnpm marca:sync` y sube también las copias que genere.

El CI corre `pnpm marca:check`, que falla si una copia se desvió de la fuente,
si falta, o si sobra un archivo que ya no está en el manifiesto.

## Por qué copias y no un import

Las apps son estáticas o de Next, y cada una se despliega con su propio Root
Directory en Vercel. Leer de `packages/` durante el build exige activar «incluir
archivos fuera del Root Directory» en cada proyecto: una casilla de un panel,
fácil de olvidar en el proyecto siguiente, que rompe el despliegue sin avisar.
La copia va al repositorio y el CI la vigila — la comprobación vive donde vive
el código.

## Por qué un manifiesto y no copiar todo

Las ilustraciones pesan unos 200 KB cada una. Copiarlas a las siete apps mete un
megabyte largo en el repositorio para que seis no lo usen. Como efecto
secundario, el manifiesto deja escrito quién usa qué, que antes no lo sabía
nadie.

## Para correos y documentos

No tienen origen propio, así que ahí no vale `/marca/…`: se incrusta el SVG en
el propio documento, o se usa la URL absoluta `https://evetev.com/marca/…`. El
panel de administración de la API (`apps/api`) es el primer caso: no sirve
archivos estáticos, así que lleva los tokens y el isotipo incrustados.
