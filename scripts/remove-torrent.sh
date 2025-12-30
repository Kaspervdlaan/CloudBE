#!/bin/bash

# aria2 Torrent Remover Script
# Usage: ./remove-torrent.sh <GID>

# Try to load variables from .env file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ] && [ -z "$ARIA2_RPC_SECRET" ]; then
    ARIA2_RPC_SECRET=$(grep -E '^ARIA2_RPC_SECRET=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    export ARIA2_RPC_SECRET
fi
if [ -f "$PROJECT_ROOT/.env" ] && [ -z "$ARIA2_RPC_URL" ]; then
    ARIA2_RPC_URL=$(grep -E '^ARIA2_RPC_URL=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    export ARIA2_RPC_URL
fi

ARIA2_RPC_URL="${ARIA2_RPC_URL:-http://localhost:6800/jsonrpc}"
ARIA2_RPC_SECRET="${ARIA2_RPC_SECRET:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: GID is required${NC}"
    echo "Usage: $0 <GID>"
    echo "To get GIDs, run: ./scripts/status-torrents.sh"
    exit 1
fi

GID="$1"

# Make RPC call
if [ -z "$ARIA2_RPC_SECRET" ]; then
    payload="{\"jsonrpc\":\"2.0\",\"method\":\"aria2.forceRemove\",\"id\":\"remove\",\"params\":[\"$GID\"]}"
else
    payload="{\"jsonrpc\":\"2.0\",\"method\":\"aria2.forceRemove\",\"id\":\"remove\",\"params\":[\"token:${ARIA2_RPC_SECRET}\",\"$GID\"]}"
fi

echo -e "${YELLOW}Removing download: ${GID}${NC}"

RESULT=$(curl -s -X POST "$ARIA2_RPC_URL" \
    -H "Content-Type: application/json" \
    -d "$payload")

if echo "$RESULT" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', {}).get('message', 'Unknown error'))" 2>/dev/null)
    echo -e "${RED}Error: ${ERROR_MSG}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Download removed successfully${NC}"
echo "Note: Files already downloaded are NOT deleted from disk"

