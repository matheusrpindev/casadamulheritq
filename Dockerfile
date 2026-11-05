# Imagem de produção do Acolhe (Next.js standalone + migrações).
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS dependencias
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=dependencias /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS dependencias-producao
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS final
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S acolhe && adduser -S acolhe -G acolhe
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=dependencias-producao /app/node_modules ./node_modules
COPY drizzle ./drizzle
COPY scripts/migrar.mjs scripts/criar-admin.mjs ./scripts/
USER acolhe
EXPOSE 3000
# Aplica as migrações pendentes e sobe o servidor.
CMD ["sh", "-c", "node scripts/migrar.mjs && node server.js"]
