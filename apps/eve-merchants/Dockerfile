# Eve Merchants (Next.js) — imagen para Railway.
#
# Contexto de build = raíz del monorepo.
# En Railway: "Root Directory" vacío, "Dockerfile Path" = apps/eve-merchants/Dockerfile.
# Variables requeridas: NEXT_PUBLIC_EVEPAY_API_URL

FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @evetev/eve-merchants build

FROM node:22-slim AS runner
RUN corepack enable
WORKDIR /repo

ENV NODE_ENV=production

COPY --from=build /repo/apps/eve-merchants/.next/standalone ./
COPY --from=build /repo/apps/eve-merchants/.next/static ./apps/eve-merchants/.next/static
COPY --from=build /repo/apps/eve-merchants/public ./apps/eve-merchants/public 2>/dev/null || true

EXPOSE 3003
ENV PORT=3003
CMD ["node", "apps/eve-merchants/server.js"]
