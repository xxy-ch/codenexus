#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/online_judge}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/bootstrap_demo.sql"

if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
else
  docker compose exec -T postgres psql \
    "postgresql://postgres:postgres@postgres:5432/online_judge" \
    -v ON_ERROR_STOP=1 \
    -f - < "$SQL_FILE"
fi

echo "Demo data bootstrapped into ${DATABASE_URL}."
