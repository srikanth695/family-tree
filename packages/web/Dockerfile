# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/web/package*.json ./packages/web/
COPY packages/types/package*.json ./packages/types/

RUN npm install

COPY . .

# Build sequence: types (tsc) -> web (next build)
RUN npm run build -w @family-tree/types
RUN npm run build -w @family-tree/web

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/web/.next ./.next
COPY --from=builder /app/packages/web/public ./public
COPY --from=builder /app/packages/web/package*.json ./
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
