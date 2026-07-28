# EvePay API (NestJS) — imagen para Railway.
#
# El contexto de build es la RAÍZ del monorepo (necesario para el workspace pnpm):
# en Railway, deja "Root Directory" vacío y fija "Dockerfile Path" = apps/api/Dockerfile.
#
# Secretos (DATABASE_URL, AKUA_*) van en las Variables de Railway, nunca aquí (§4).

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

# Copiamos todo el monorepo y resolvemos el workspace completo (con devDeps: se
# necesitan para compilar). El .dockerignore evita traer node_modules/artefactos.
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @evetev/shared build \
 && pnpm --filter @evetev/api build

ENV NODE_ENV=production
WORKDIR /repo/apps/api
# Railway inyecta PORT; main.ts lo lee. Arranca el bundle ya compilado.
CMD ["node", "dist/main.js"]
