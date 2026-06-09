#!/usr/bin/env bash
# Deploy script: pull, build, and run containers.
# Run from repo root: ./scripts/deploy.sh
# Or from anywhere: /path/to/stenaskartinami/scripts/deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

# Use docker-compose (hyphen) if plugin not available (e.g. AWS standalone binary)
if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Pulling latest code..."
git pull

echo "==> Building and starting containers..."
$COMPOSE -f "$COMPOSE_FILE" up -d --build

echo "==> Waiting a few seconds for containers to start..."
sleep 5

echo "==> Container status:"
$COMPOSE -f "$COMPOSE_FILE" ps

echo ""
echo "Done. API: http://localhost:1337  Frontend: http://localhost:3000"
echo "Logs: $COMPOSE -f $COMPOSE_FILE logs -f"
