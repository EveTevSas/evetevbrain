#!/usr/bin/env bash
# Fija la identidad de commits de este repo bajo Evetev (config local).
# Uso: ./scripts/setup-git.sh
set -euo pipefail

git config user.name "Evetev"
git config user.email "contacto@evetev.com"

echo "Identidad de commits configurada para este repo:"
echo "  user.name  = $(git config user.name)"
echo "  user.email = $(git config user.email)"
