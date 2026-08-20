# Cómo publicar este paquete (5 minutos)

Pasos únicos para dejar los activos disponibles por URL para todo el equipo.

## 1\. Crear el repositorio

En la organización **Evetev-Dev** de GitHub → **New repository**

- Nombre: `brand`
- Visibilidad: **Público** (requisito para que jsDelivr lo sirva; los logos son públicos por naturaleza)
- Sin README (ya viene uno aquí)

## 2\. Subir los archivos

Desde la carpeta `brand/` en tu computador:

cd brand

git init

git add .

git commit \-m "feat(brand): activos de marca v1 y tokens de color"

git branch \-M main

git remote add origin https://github.com/Evetev-Dev/brand.git

git push \-u origin main

## 3\. Etiquetar la versión 1

git tag v1.0.0

git push \--tags

Esto habilita las URLs `@1` (siempre la última 1.x) y `@1.0.0` (congelada exacta).

## 4\. Verificar

Abre en el navegador — debe mostrarse el isotipo:

https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-azul-noche.svg

La primera petición puede tardar unos segundos mientras jsDelivr cachea; después es instantánea y global.

## 5\. Avisar al equipo

Comparte el enlace del repo. El `README.md` tiene el catálogo completo y los snippets listos para copiar.

---

## Notas

- **2FA obligatorio** en la organización (ya está en sus estándares §8) — aplica también a este repo.
- **Branch protection sobre `main`:** exigir PR \+ 1 aprobación. Un logo mal cambiado se replica al instante en todos los proyectos, así que merece el mismo cuidado que el código.
- Los **archivos originales editables** (Figma, .ai, fotos en tamaño completo) van en Google Drive, no aquí. Este repo distribuye lo optimizado para web; Drive archiva lo maestro.
