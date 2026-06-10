#!/usr/bin/env bash
# Usage:
#   ./scripts/logs.sh          — tail all services
#   ./scripts/logs.sh front    — tail only front
#   ./scripts/logs.sh api      — tail only api-v5
#   ./scripts/logs.sh errors   — errors only (front + api)

set -e
COMPOSE="docker compose -f $(dirname "$0")/../docker-compose.prod.yml"

case "${1:-}" in
  front)  $COMPOSE logs -f --tail=100 front ;;
  api)    $COMPOSE logs -f --tail=100 api-v5 ;;
  errors) $COMPOSE logs -f --tail=200 front api-v5 2>&1 | grep -iE "error|warn|exception|500|403|failed" ;;
  *)      $COMPOSE logs -f --tail=100 front api-v5 ;;
esac
