# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies first
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/database/package*.json ./packages/database/
COPY packages/types/package*.json ./packages/types/

RUN npm install

COPY . .

# Build sequence: database (prisma generate) -> types (tsc) -> server (nest build)
RUN npm run db:generate -w @family-tree/database
RUN npm run build -w @family-tree/types
RUN npm run build -w @family-tree/server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy build artifacts and necessary files
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package*.json ./
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main"]
