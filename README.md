# Family Tree App

Monorepo for a collaborative family-tree product:

| Package | Role |
|---------|------|
| `packages/web` | Next.js 16 UI (Auth.js / NextAuth) |
| `packages/server` | NestJS 12 API |
| `packages/database` | Prisma 7 + Postgres |
| `packages/types` | Shared TypeScript types / roles |

**Requirements**

- Node.js **22+** (Docker images use Node 22 LTS)
- npm 10+
- Docker Desktop (for container runs)
- PostgreSQL 15+ (Docker Compose **or** a remote instance)

---

## Quick start matrix

| Goal | Postgres | How to run |
|------|----------|------------|
| Full stack in Docker | Docker Postgres | [A. Docker + Compose DB](#a-docker--compose-postgres) |
| Apps in Docker | Remote / host Postgres | [B. Docker + remote Postgres](#b-docker--remote-postgres) |
| Local Node apps | Docker Postgres only | [C. Local apps + Docker Postgres](#c-local-apps--docker-postgres) |
| Local Node apps | Remote Postgres | [D. Local apps + remote Postgres](#d-local-apps--remote-postgres) |

Default local URLs:

- Web: http://localhost:3000  
- API: http://localhost:3001  
- Postgres: `localhost:5432` (when using Compose DB)

Demo users (only if seed is enabled):

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `adminpassword123` | admin |
| `demo@family.local` | `demo12345` | user |

Passwords are set **on first create only** and are not reset on later seeds.

---

## Environment variables

Copy `.env.example` to `.env` at the repo root (and optionally `packages/server/.env` for Nest).

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | API, Prisma | Postgres connection string |
| `JWT_SECRET` | API | Sign/verify API JWTs (**required** when `NODE_ENV=production`) |
| `INTERNAL_AUTH_SECRET` | API + Web | Shared secret for NextAuth → API OAuth upsert |
| `NEXTAUTH_SECRET` | Web | NextAuth session encryption |
| `NEXTAUTH_URL` | Web + API CORS | Public web origin, e.g. `http://localhost:3000` |
| `WEB_ORIGIN` | API | CORS allowlist fallback |
| `NEXT_PUBLIC_API_URL` | Web (browser) | Public API URL, e.g. `http://localhost:3001` |
| `API_INTERNAL_URL` | Web (server) | In-Docker API URL, e.g. `http://api:3001` |
| `UPLOAD_ROOT` | API | Absolute upload directory (Docker: `/app/uploads`) |
| `RUN_DB_MIGRATE` | API container | `true` → `prisma migrate deploy` on start |
| `RUN_DB_SEED` | API container | `true` → run seed (local/demo only) |
| `RUN_DB_PUSH` | API container | `true` → `prisma db push` (recovery only; default `false`) |
| `GOOGLE_CLIENT_ID` / `SECRET` | Web | Optional Google OAuth |

Example `DATABASE_URL`:

```text
postgresql://USER:PASSWORD@HOST:5432/family_tree?schema=public
```

For SSL-managed hosts, append e.g. `&sslmode=require`.

---

## A. Docker + Compose Postgres

Full stack: **db + api + web**.

1. Start Docker Desktop and wait until it is running.
2. From the repo root:

```powershell
npm run docker:up
```

Detached:

```powershell
npm run docker:up -- -d
```

3. Open http://localhost:3000  

Stop:

```powershell
npm run docker:down
```

Notes:

- `scripts/docker-up.ps1` waits for the Docker engine, frees ports **3000/3001** used by local Node (not Docker Desktop processes), then runs `docker compose up --build`.
- API applies migrations (`RUN_DB_MIGRATE=true`) and seeds demo users (`RUN_DB_SEED=true`) by default.
- DB data persists in the `postgres_data` volume; uploads in `api_uploads`.

More Docker detail: [DOCKER.md](./DOCKER.md).

---

## B. Docker + remote Postgres

Run **api + web** in Docker against an existing Postgres (cloud, LAN, or Postgres on the host).

1. Ensure the DB is reachable **from inside containers**.
   - Host Postgres (Docker Desktop):  
     `postgresql://postgres:PASSWORD@host.docker.internal:5432/family_tree?schema=public`
   - Cloud: provider URL (add `sslmode=require` when needed).
2. Create the database if it does not exist.
3. Start:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/family_tree?schema=public"
# Optional first-time demo data on a fresh DB:
$env:RUN_DB_SEED = "true"

npm run docker:up:remote-db
# detached:
npm run docker:up:remote-db -- -d
```

Equivalent manual command:

```powershell
docker compose -f docker-compose.yml -f docker-compose.remote-db.yml up --build
```

The override disables Compose `db`, uses your `DATABASE_URL`, and defaults `RUN_DB_SEED=false` (safer for shared DBs). Migrations still run when `RUN_DB_MIGRATE=true` (default).

---

## C. Local apps + Docker Postgres

Use only the Compose database; run API and Web with Node on the host.

1. Start Postgres:

```powershell
docker compose up -d db
```

2. Configure root `.env` (and `packages/server/.env` if you use it):

```env
DATABASE_URL="postgresql://postgres:root123@localhost:5432/family_tree?schema=public"
JWT_SECRET="change_me_local_jwt_secret"
INTERNAL_AUTH_SECRET="change_me_internal_auth_secret"
NEXTAUTH_SECRET="change_me_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
WEB_ORIGIN="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://127.0.0.1:3001"
```

3. Install and prepare DB:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Run apps (API `:3001`, Web `:3000`):

```powershell
npm run dev
```

Production-style local build:

```powershell
npm run build
npm run start -w @family-tree/server
npm run start -w @family-tree/web
```

---

## D. Local apps + remote Postgres

Same as **C**, but set `DATABASE_URL` to the remote instance and skip `docker compose up db`.

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST:5432/family_tree?schema=public"
npm install
npm run db:generate
npm run db:migrate
# optional demo data:
npm run db:seed
npm run dev
```

Ensure your IP is allowed on the remote firewall / cloud allowlist.

---

## Database commands

Run from repo root (uses `packages/database` + `DATABASE_URL`):

| Command | Meaning |
|---------|---------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:push` | Push schema without migrations (dev recovery only) |
| `npm run db:seed` | Idempotent demo seed |

Migrations live in `packages/database/prisma/migrations`.

---

## Roles (brief)

System roles: `admin`, `family_tree_admin`, `family_admin`, `user`.  
Rights are defined in `packages/types`. Admin UI: `/admin` (admin role).

---

## Code review notes (current codebase)

**Safe for local / Docker demo.** Before any shared or production deploy, address:

1. **Secrets** — Compose / `.env.docker` use fixed local secrets; rotate for anything beyond a laptop.
2. **Demo seed** — disable `RUN_DB_SEED` on shared databases.
3. **Postgres port** — Compose publishes `5432` to the host for convenience; lock down or stop publishing for shared machines.
4. **Media** — files are served via authenticated `GET /media/:id/file` (not public static).
5. **Node** — Prisma/Nest tooling targets LTS Node 22; local Node 23 may need `npm install --ignore-scripts` then `npm run db:generate`.

---

## Project layout

```text
packages/
  web/          Next.js UI
  server/       NestJS API + Docker image
  database/     Prisma schema, migrations, seed
  types/        Shared roles / labels
docker/
  server-entrypoint.sh
docker-compose.yml
docker-compose.remote-db.yml
scripts/docker-up.ps1
```

## Tests

```powershell
npm test
```

## License / status

Private monorepo — local development and Docker demo setup.
