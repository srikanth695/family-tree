#!/bin/sh
set -e

export NODE_PATH="${NODE_PATH:-/app/node_modules}"
export UPLOAD_ROOT="${UPLOAD_ROOT:-/app/uploads}"
cd /app/packages/server

echo "Waiting for database..."
i=0
until node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT 1'))
  .then(async () => { await client.end(); process.exit(0); })
  .catch(async () => { try { await client.end(); } catch (_) {} process.exit(1); });
" 2>/dev/null; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "Database did not become ready in time"
    exit 1
  fi
  sleep 2
done

cd /app/packages/database

if [ "${RUN_DB_MIGRATE:-true}" = "true" ]; then
  echo "Applying database migrations..."
  if ! npx prisma migrate deploy; then
    echo "migrate deploy failed (likely legacy db push schema). Baselining init migration..."
    npx prisma migrate resolve --applied 20260908120000_init || true
    npx prisma migrate deploy || {
      echo "Migration still failing; refusing silent db push. Set RUN_DB_PUSH=true only for local recovery."
      exit 1
    }
  fi
fi

if [ "${RUN_DB_PUSH:-false}" = "true" ]; then
  echo "Syncing schema with prisma db push (explicit opt-in)..."
  npx prisma db push
fi

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "Seeding database (idempotent; passwords not reset)..."
  npm run db:seed || echo "Seed skipped or already applied"
fi

echo "Starting API..."
cd /app
exec "$@"
