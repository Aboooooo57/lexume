#!/usr/bin/env bash
# Run ON the server, from the uploaded /opt/lexume/deploy directory:
#   bash setup-server.sh
# Installs Docker if missing, writes .env (random secrets generated here;
# API keys are typed at the prompts and never leave this machine), and starts
# the backend on port 8000 with its SQLite file on a persistent volume.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if [[ -f .env ]]; then
  echo ".env already exists - keeping it (delete it to re-run the prompts)."
else
  ask()  { local v; read -r -p "$1: " v; printf '%s' "$v"; }
  asks() { local v; read -r -s -p "$1: " v; echo >&2; printf '%s' "$v"; }
  IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
  ORIGINS="$(ask "Frontend URL allowed to call this API (e.g. https://your-app.vercel.app)")"
  GEMINI="$(asks "GEMINI_API_KEY (hidden)")"
  ELEVEN="$(asks "ELEVENLABS_API_KEY (hidden, Enter to skip)")"
  GCID="$(ask "GOOGLE_CLIENT_ID")"
  GCSEC="$(asks "GOOGLE_CLIENT_SECRET (hidden)")"
  BASE="$(ask "Public base URL of this API [http://$IP:8000]")"; BASE="${BASE:-http://$IP:8000}"
  umask 077
  cat > .env <<ENV
ALLOWED_ORIGINS=$ORIGINS
GEMINI_API_KEY=$GEMINI
ELEVENLABS_API_KEY=$ELEVEN
GOOGLE_CLIENT_ID=$GCID
GOOGLE_CLIENT_SECRET=$GCSEC
GOOGLE_REDIRECT_URI=$BASE/api/auth/google/callback
GOOGLE_DRIVE_REDIRECT_URI=$BASE/api/auth/drive/callback
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_SECRET=$(openssl rand -base64 32 | tr '+/' '-_')
ADMIN_API_KEY=$(openssl rand -hex 24)
ENV
  echo "Wrote .env (mode 600)."
fi

docker compose -f docker-compose.prod.yml up -d --build
sleep 5
echo "--- status ---"
docker compose -f docker-compose.prod.yml ps
curl -fsS http://localhost:8000/docs -o /dev/null && echo "Backend is answering on :8000" || docker compose -f docker-compose.prod.yml logs --tail 30 backend
