#!/usr/bin/env bash
set -euo pipefail

export NEMOCLAW_BRIDGE_HOST="${NEMOCLAW_BRIDGE_HOST:-127.0.0.1}"
export NEMOCLAW_BRIDGE_PORT="${NEMOCLAW_BRIDGE_PORT:-8787}"
export NEMOCLAW_BRIDGE_TOKEN_FILE="${NEMOCLAW_BRIDGE_TOKEN_FILE:-$HOME/.nemoclaw-gateway-token}"

exec "$HOME/.agents/skills/nemoclaw-bridge/scripts/server"
