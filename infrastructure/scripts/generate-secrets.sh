#!/usr/bin/env bash
set -euo pipefail

echo "=== VoiceMind Secret Generator ==="
echo ""
echo "Postgres Password:"
openssl rand -base64 32
echo ""
echo "JWT Secret:"
openssl rand -hex 32
echo ""
echo "LiveKit API Key:"
echo "API$(openssl rand -hex 6)"
echo ""
echo "LiveKit API Secret:"
openssl rand -base64 32
echo ""
echo "Copy these values into your .env file"
