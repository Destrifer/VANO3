# syntax=docker/dockerfile:1
# Astro (Node standalone адаптер) — публичный сайт printmos.ru.
# Двухстадийная сборка: builder (npm ci + astro build) -> runner (только prod-deps + dist).

# ---- build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# ВАЖНО: на СБОРКЕ Astro читает контент из Directus (prerender страниц) и оптимизирует
# remote-картинки галереи. `docker compose build` изолирован от рантайм-сети, поэтому
# здесь Directus должен быть доступен по ПУБЛИЧНОМУ URL (после того как он поднят и засижен).
# В рантайме /api ходят в Directus по внутреннему адресу (см. docker-compose.prod.yml).
ARG DIRECTUS_URL
ARG DIRECTUS_PUBLIC_URL
ENV DIRECTUS_URL=${DIRECTUS_URL}
ENV DIRECTUS_PUBLIC_URL=${DIRECTUS_PUBLIC_URL}

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

EXPOSE 4321
# Astro node standalone слушает HOST:PORT (см. astro.config.mjs adapter: node standalone).
CMD ["node", "./dist/server/entry.mjs"]
