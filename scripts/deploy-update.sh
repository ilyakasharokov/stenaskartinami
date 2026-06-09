#!/usr/bin/env bash
# Quick update: pull and recreate only changed services (faster than full deploy).
# Run from repo root: ./scripts/deploy-update.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Pulling latest code..."
git pull

echo "==> Recreating containers (no cache)..."
$COMPOSE -f "$COMPOSE_FILE" up -d --build

$COMPOSE -f "$COMPOSE_FILE" ps
echo "Done."
