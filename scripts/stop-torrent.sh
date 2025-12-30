#!/bin/bash

# aria2 Torrent Stopper Script
# Usage: ./stop-torrent.sh <GID>
#        ./stop-torrent.sh --all (stops all active downloads)

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

# Check if GID is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: GID is required${NC}"
    echo "Usage: $0 <GID>"
    echo "       $0 --all (stops all active downloads)"
    echo ""
    echo "To get GIDs, run: ./scripts/status-torrents.sh"
    exit 1
fi

# Make RPC call
make_rpc_call() {
    local method=$1
    local params=$2
    
    if [ -z "$ARIA2_RPC_SECRET" ]; then
        local payload="{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":\"stop\",\"params\":[$params]}"
    else
        local payload="{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":\"stop\",\"params\":[\"token:${ARIA2_RPC_SECRET}\",$params]}"
    fi
    
    curl -s -X POST "$ARIA2_RPC_URL" \
        -H "Content-Type: application/json" \
        -d "$payload"
}

# Stop all downloads
if [ "$1" = "--all" ]; then
    echo -e "${YELLOW}Stopping all active downloads...${NC}"
    
    # Get all active GIDs
    if [ -z "$ARIA2_RPC_SECRET" ]; then
        ACTIVE_PAYLOAD="{\"jsonrpc\":\"2.0\",\"method\":\"aria2.tellActive\",\"id\":\"list\",\"params\":[]}"
    else
        ACTIVE_PAYLOAD="{\"jsonrpc\":\"2.0\",\"method\":\"aria2.tellActive\",\"id\":\"list\",\"params\":[\"token:${ARIA2_RPC_SECRET}\"]}"
    fi
    
    ACTIVE_RESPONSE=$(curl -s -X POST "$ARIA2_RPC_URL" \
        -H "Content-Type: application/json" \
        -d "$ACTIVE_PAYLOAD")
    
    GIDS=$(echo "$ACTIVE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    gids = [t.get('gid') for t in data.get('result', [])]
    print(' '.join(gids))
except:
    pass
" 2>/dev/null)
    
    if [ -z "$GIDS" ]; then
        echo "No active downloads to stop"
        exit 0
    fi
    
    for GID in $GIDS; do
        echo -e "Stopping download: ${GID}"
        RESULT=$(make_rpc_call "aria2.forcePause" "\"$GID\"")
        if echo "$RESULT" | grep -q '"error"'; then
            echo -e "${RED}  Error stopping ${GID}${NC}"
        else
            echo -e "${GREEN}  ✓ Stopped ${GID}${NC}"
        fi
    done
    
    # Force remove all
    echo -e "${YELLOW}Removing downloads...${NC}"
    for GID in $GIDS; do
        RESULT=$(make_rpc_call "aria2.forceRemove" "\"$GID\"")
        if echo "$RESULT" | grep -q '"error"'; then
            echo -e "${RED}  Error removing ${GID}${NC}"
        else
            echo -e "${GREEN}  ✓ Removed ${GID}${NC}"
        fi
    done
    
    exit 0
fi

# Stop specific download
GID="$1"
echo -e "${YELLOW}Stopping download: ${GID}${NC}"

RESULT=$(make_rpc_call "aria2.forcePause" "\"$GID\"")

if echo "$RESULT" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESULT" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', {}).get('message', 'Unknown error'))" 2>/dev/null)
    echo -e "${RED}Error: ${ERROR_MSG}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Download stopped successfully${NC}"
echo ""
echo "Note: The download is paused. To remove it completely, run:"
echo "  ./scripts/remove-torrent.sh ${GID}"

