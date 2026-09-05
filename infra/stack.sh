#!/usr/bin/env bash
# Startet und prüft den lokalen Entwicklungs-Stack.
#
# Bereitschaft wird vom Host aus geprüft, nicht im Container: das Qdrant-Image
# enthält weder curl noch wget.
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$INFRA_DIR/docker-compose.yml")
QDRANT_URL="http://127.0.0.1:${QDRANT_HTTP_PORT:-6333}"

require_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker läuft nicht. Docker Desktop starten und erneut versuchen." >&2
    exit 1
  fi
}

wait_for() {
  local name="$1" url="$2" attempts="${3:-40}"
  printf '%-14s' "$name"
  for _ in $(seq 1 "$attempts"); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "bereit"
      return 0
    fi
    sleep 1
  done
  echo "NICHT bereit ($url)"
  return 1
}

case "${1:-up}" in
  up)
    require_docker
    "${COMPOSE[@]}" up -d
    echo
    wait_for "qdrant" "$QDRANT_URL/readyz"
    echo
    "$0" status
    ;;

  down)
    require_docker
    "${COMPOSE[@]}" down
    ;;

  reset)
    # Verwirft auch die Volumes. Der Index muss danach neu geladen werden.
    require_docker
    "${COMPOSE[@]}" down -v
    ;;

  status)
    require_docker
    "${COMPOSE[@]}" ps
    echo
    wait_for "qdrant" "$QDRANT_URL/readyz" 1 || true
    collections=$(curl -fsS --max-time 2 "$QDRANT_URL/collections" 2>/dev/null || echo "")
    if [ -n "$collections" ]; then
      echo "Kollektionen:  $collections"
    fi
    ;;

  *)
    echo "Aufruf: stack.sh [up|down|reset|status]" >&2
    exit 1
    ;;
esac
