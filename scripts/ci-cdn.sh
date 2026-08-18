#!/usr/bin/env bash
# Comprueba que TODAS las URLs del CDN de marca que aparecen en el repositorio
# respondan 200.
#
# Por qué existe: el 15 de agosto de 2026 se mezcló un cambio que apuntaba a
# `flujo-de-pago.svg` cuando esa ruta todavía no estaba etiquetada en el
# repositorio de marca. `@1` seguía resolviendo a la versión anterior, el
# archivo daba 404 y la portada de EvePay se quedó DOS DÍAS sin fondo. Nada en
# este repositorio estaba roto, que es lo peor del fallo: el CSS era correcto y
# la página no se veía.
#
# Este check corre SIEMPRE, no solo cuando el PR toca una landing, y es a
# propósito: lo que rompe estas URLs casi nunca es un cambio de aquí, sino algo
# que pasó —o que no pasó— en el otro repositorio. Una etiqueta que nadie
# publicó, una purga que nadie hizo. Filtrarlo por «¿este PR tocó las landings?»
# lo dejaría ciego justo ante el caso que vino a cazar.
set -uo pipefail

echo "Buscando URLs del CDN de marca..."
# El patrón exige ruta después de la versión: `...brand@1` a secas no es un
# archivo, es la constante base que arma las URLs en apps/eve-studio, y pedirle
# 200 devuelve 400 para siempre.
URLS=$(grep -rhoE 'https://cdn\.jsdelivr\.net/gh/Evetev-Dev/brand@[^/"'"'"')\ ]+/[^"'"'"')\ ]+' \
         --include='*.html' --include='*.css' --include='*.js' --include='*.mjs' \
         --include='*.ts' --include='*.tsx' --include='*.py' --include='*.json' \
         apps packages 2>/dev/null | sort -u)

if [ -z "$URLS" ]; then
  echo "No hay ninguna. Nada que comprobar."
  exit 0
fi

TOTAL=0
ROTAS=0
while IFS= read -r url; do
  TOTAL=$((TOTAL + 1))
  # -L porque jsDelivr redirige, y HEAD porque no hace falta el cuerpo.
  codigo=$(curl -sSL -o /dev/null -w '%{http_code}' --max-time 20 -I "$url" || echo "000")
  if [ "$codigo" = "200" ]; then
    printf '  ok   %s\n' "$url"
  else
    printf '  %s  %s\n' "$codigo" "$url"
    ROTAS=$((ROTAS + 1))
  fi
done <<< "$URLS"

echo
if [ "$ROTAS" -gt 0 ]; then
  echo "::error::$ROTAS de $TOTAL URLs del CDN no responden 200."
  cat <<'AYUDA'

Casi siempre es una de estas tres, en este orden de probabilidad:

  1. El archivo está en main del repositorio de marca pero NADIE ETIQUETÓ.
     Sin etiqueta, @1 sigue sirviendo el árbol anterior. Se arregla etiquetando
     una versión nueva sobre el commit ya mezclado — nunca antes de mezclarlo.

  2. Se etiquetó pero no se purgó. jsDelivr cachea la resolución del rango @1,
     así que la etiqueta sola no basta:
       curl -s "https://purge.jsdelivr.net/gh/Evetev-Dev/brand@1/<ruta>"

  3. La ruta está mal escrita. Compárala con el catálogo del README de marca.

AYUDA
  exit 1
fi
echo "Las $TOTAL URLs del CDN responden 200."
