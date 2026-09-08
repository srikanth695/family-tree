# Docker reference

Full runbook (local Node, remote Postgres, Compose DB): see **[README.md](./README.md)**.

## Default stack (Compose Postgres)

```powershell
npm run docker:up          # foreground, rebuild
npm run docker:up -- -d    # detached
npm run docker:down
```

Services:

| Service | Image / build | Port |
|---------|---------------|------|
| `db` | `postgres:15-alpine` | 5432 |
| `api` | `packages/server/Dockerfile` | 3001 |
| `web` | `packages/web/Dockerfile` | 3000 |

API entrypoint (`docker/server-entrypoint.sh`):

1. Wait for Postgres  
2. `prisma migrate deploy` if `RUN_DB_MIGRATE=true`  
3. Optional `db push` if `RUN_DB_PUSH=true`  
4. Optional seed if `RUN_DB_SEED=true`  
5. Start Nest (`node /app/packages/server/dist/main.js`)

## Remote Postgres (no Compose DB)

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/family_tree?schema=public"
docker compose -f docker-compose.yml -f docker-compose.remote-db.yml up --build
```

From the host to a DB on the same machine (Docker Desktop):

```text
postgresql://postgres:root123@host.docker.internal:5432/family_tree?schema=public
```

## Env files

| File | Role |
|------|------|
| `.env.example` | Template for local Node |
| `.env.docker` | Example Compose-oriented values (local/dev only) |
| `docker-compose.yml` | Hard-coded local-demo secrets for the default stack |

Do not reuse demo secrets outside local development.

## Uploads

- Volume: `api_uploads` → `/app/uploads`  
- Auth: `GET /media/:id/file` with JWT (`Authorization: Bearer …` or `?access_token=`)

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `dockerDesktopLinuxEngine` pipe missing | Start Docker Desktop; wait until Running |
| Port 3000/3001 busy | `npm run docker:up` frees local Node listeners (skips Docker processes) |
| `Cannot find module '@nestjs/core'` | Rebuild API image (`docker compose build --no-cache api`) |
| `P3005` / non-empty DB without migrations | Entrypoint baselines `20260908120000_init`; or run `prisma migrate resolve` |
| Web OK, API down | `docker compose logs api` |

## Image builds (manual)

```powershell
docker build -f packages/server/Dockerfile -t family-tree-api .
docker build -f packages/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t family-tree-web .
```
