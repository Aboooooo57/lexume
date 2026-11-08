#!/usr/bin/env bash
# Run ON the server, from the uploaded ~/lexume/deploy directory:
#   bash setup-server.sh   (needs sudo rights if not root)
# Installs Docker if missing, writes .env (random secrets generated here;
# API keys are typed at the prompts and never leave this machine), and starts
# the whole app (frontend + backend + HTTPS) behind one address.
set -euo pipefail
cd "$(dirname "$0")"

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then SUDO="sudo"; fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker (may ask for your sudo password)..."
  curl -fsSL https://get.docker.com | $SUDO sh
fi
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then DOCKER="$SUDO docker"; fi

IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
# No domain needed: <ip-with-dashes>.sslip.io resolves to the IP, and Caddy
# can get a real HTTPS certificate for it.
HOST="${SITE_HOST:-${IP//./-}.sslip.io}"
BASE="https://$HOST"

set_kv() { # set_kv KEY VALUE  (add or replace in .env)
  if grep -q "^$1=" .env 2>/dev/null; then
    sed -i.bak "s|^$1=.*|$1=$2|" .env && rm -f .env.bak
  else
    echo "$1=$2" >> .env
  fi
}

if [[ -f .env ]]; then
  echo ".env already exists - keeping your keys, refreshing the address settings."
else
  ask()  { local v; read -r -p "$1: " v; printf '%s' "$v"; }
  asks() { local v; read -r -s -p "$1: " v; echo >&2; printf '%s' "$v"; }
  GEMINI="$(asks "GEMINI_API_KEY (hidden)")"
  ELEVEN="$(asks "ELEVENLABS_API_KEY (hidden, Enter to skip)")"
  GCID="$(ask "GOOGLE_CLIENT_ID")"
  GCSEC="$(asks "GOOGLE_CLIENT_SECRET (hidden)")"
  umask 077
  cat > .env <<ENV
GEMINI_API_KEY=$GEMINI
ELEVENLABS_API_KEY=$ELEVEN
GOOGLE_CLIENT_ID=$GCID
GOOGLE_CLIENT_SECRET=$GCSEC
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_SECRET=$(openssl rand -base64 32 | tr '+/' '-_')
ADMIN_API_KEY=$(openssl rand -hex 24)
ENV
  echo "Wrote .env (mode 600)."
fi
set_kv SITE_HOST "$HOST"
set_kv FRONTEND_URL "$BASE"
set_kv ALLOWED_ORIGINS "$BASE"
set_kv GOOGLE_REDIRECT_URI "$BASE/api/auth/google/callback"
set_kv GOOGLE_DRIVE_REDIRECT_URI "$BASE/api/auth/drive/callback"

if command -v ufw >/dev/null 2>&1 && $SUDO ufw status | grep -q "Status: active"; then
  $SUDO ufw allow 80/tcp && $SUDO ufw allow 443/tcp
fi

echo "Building and starting (the first build takes several minutes)..."
$DOCKER compose -f docker-compose.prod.yml up -d --build
sleep 8
$DOCKER compose -f docker-compose.prod.yml ps
echo
echo "Open:  $BASE"
echo "Add this Authorized redirect URI in Google Cloud Console:"
echo "  $BASE/api/auth/google/callback"
echo "  $BASE/api/auth/drive/callback"
