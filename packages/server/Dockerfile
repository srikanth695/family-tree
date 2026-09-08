# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* .npmrc ./
COPY packages/server/package.json ./packages/server/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
RUN npm install

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/.npmrc ./
COPY --from=deps /app/packages ./packages
COPY packages/types ./packages/types
COPY packages/database ./packages/database
COPY packages/server ./packages/server
COPY turbo.json ./turbo.json

ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/familytree?schema=public"

RUN rm -rf packages/server/dist packages/server/tsconfig.tsbuildinfo \
  && npm install \
  && npm run build -w @family-tree/types \
  && npm run build -w @family-tree/database \
  && npm run build -w @family-tree/server

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV NODE_PATH=/app/node_modules
ENV UPLOAD_ROOT=/app/uploads
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/uploads

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/server/package.json ./packages/server/package.json
COPY --from=builder /app/packages/server/dist ./packages/server/dist
# Nest workspace deps are often nested here (not fully hoisted to root)
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY docker/server-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && test -e packages/server/node_modules/@nestjs/core/package.json \
  || test -e node_modules/@nestjs/core/package.json

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "/app/packages/server/dist/main.js"]
