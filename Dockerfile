# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV SYNC_SCHEDULER_TZ=America/Toronto
ENV SYNC_SCHEDULER_HOURS=9,13
ENV SYNC_SCHEDULER_BASE_URL=http://127.0.0.1:3000
ENV PRODUCT_ALL_LOG_DB_PATH=/app/data/product-all-log.db

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/scripts/http-sync-scheduler.mjs ./scripts/http-sync-scheduler.mjs
COPY --from=builder /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

RUN chmod +x ./scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
CMD ["./scripts/docker-entrypoint.sh"]
