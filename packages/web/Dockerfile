# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc ./
COPY packages/web/package.json ./packages/web/
COPY packages/types/package.json ./packages/types/
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/.npmrc ./.npmrc
COPY --from=deps /app/packages ./packages
COPY packages/types ./packages/types
COPY packages/web ./packages/web
COPY turbo.json ./turbo.json

RUN npm install \
  && npm run build -w @family-tree/types \
  && npm run build -w @family-tree/web

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/packages/web/public

COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "packages/web/server.js"]
