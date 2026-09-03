#!/usr/bin/env bash
# Decide qué áreas del monorepo toca un cambio, para que el CI no ejecute todo
# en cada PR.
#
# Regla de oro: ante la duda, correr TODO. Equivocarse hacia ejecutar de más
# cuesta minutos; hacia ejecutar de menos deja pasar código roto, que es
# justamente lo que este filtro no puede permitirse.
#
# Espera BASE (el commit contra el que comparar) y escribe en $GITHUB_OUTPUT.
# CABEZA existe solo para poder probarlo con commits reales desde local; en CI
# se queda en HEAD.
set -euo pipefail

CABEZA="${CABEZA:-HEAD}"

marcar() { echo "$1=$2" >> "$GITHUB_OUTPUT"; echo "  $1=$2"; }

todo() {
  echo "$1 → se ejecuta todo el CI."
  for a in global shared api eveconecta eveledger evepayadmin landings; do marcar "$a" true; done
  exit 0
}

[ -n "${BASE:-}" ] || todo "No llegó una base de comparación"
git cat-file -e "${BASE}^{commit}" 2>/dev/null || todo "La base $BASE no existe en este clon"

ARCHIVOS=$(git diff --name-only "$BASE" "$CABEZA")
if [ -z "$ARCHIVOS" ]; then todo "El diff salió vacío"; fi

echo "Archivos cambiados:"
echo "$ARCHIVOS" | sed 's/^/  /'
echo

toca() { echo "$ARCHIVOS" | grep -Eq "$1"; }

# Fuera de la definición del workspace: afecta a cualquier cosa, así que se
# ejecuta todo. Es el mismo criterio que usa Vercel para desplegar.
if toca '^\.github/|^scripts/|^package\.json$|^pnpm-lock\.yaml$|^pnpm-workspace\.yaml$|^eslint\.config\.mjs$|^prettier\.config\.mjs$|^tsconfig'; then
  todo "Cambió algo de la raíz o de la configuración"
fi

marcar global false

# packages/shared y packages/config los consumen api y eveconecta.
SHARED=false
toca '^packages/(shared|config)/' && SHARED=true
marcar shared "$SHARED"

API=$SHARED
toca '^apps/api/' && API=true
marcar api "$API"

CONECTA=$SHARED
toca '^apps/eveconecta/' && CONECTA=true
marcar eveconecta "$CONECTA"

# EveLedger no consume packages/shared: es una aplicación cerrada sobre su
# propia base. Por eso no arranca desde $SHARED como las dos de arriba.
EVELEDGER=false
toca '^apps/eveledger/' && EVELEDGER=true
marcar eveledger "$EVELEDGER"

# La consola habla con la API por HTTP, pero consume packages/shared para las
# reglas que deben ser idénticas en los dos lados (el dígito del NIT).
EVEPAYADMIN=$SHARED
toca '^apps/evepay-admin/' && EVEPAYADMIN=true
marcar evepayadmin "$EVEPAYADMIN"

# Dos cosas se generan desde packages/brand y el CI vigila que no se desvíen:
# base.css y formularios.js hacia apps/website/landings/, y los activos de marca
# hacia la carpeta /marca de cada app. Cualquier app puede tener copias, así que
# esto ya no mira solo al sitio corporativo.
LANDINGS=false
toca '^apps/|^packages/brand/|^scripts/(landings|marca)-sync\.mjs$' && LANDINGS=true
marcar landings "$LANDINGS"
