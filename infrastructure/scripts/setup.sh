#!/usr/bin/env bash
set -euo pipefail

echo "=== VoiceMind Infrastructure Setup ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install it first."; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose v2 is required."; exit 1; }

# Copy env file if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example - please fill in your secrets"
  echo "Run ./scripts/generate-secrets.sh to generate random secrets"
  exit 0
fi

# Start services
echo "Starting services..."
docker compose up -d

echo ""
echo "=== Services Started ==="
echo "LiveKit:    localhost:7880"
echo "Redis:      localhost:6379"
echo "Caddy:      localhost:80/443"
echo ""
echo "Note: Supabase should be installed separately."
echo "See: https://supabase.com/docs/guides/self-hosting/docker"
