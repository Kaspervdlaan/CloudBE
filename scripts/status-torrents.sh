#!/bin/bash

# aria2 Torrent Status Script
# Shows active, waiting, and stopped downloads

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
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Make RPC call
make_rpc_call() {
    local method=$1
    local params=$2
    
    if [ -z "$ARIA2_RPC_SECRET" ]; then
        local payload="{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":\"status\",\"params\":[$params]}"
    else
        local payload="{\"jsonrpc\":\"2.0\",\"method\":\"$method\",\"id\":\"status\",\"params\":[\"token:${ARIA2_RPC_SECRET}\",$params]}"
    fi
    
    curl -s -X POST "$ARIA2_RPC_URL" \
        -H "Content-Type: application/json" \
        -d "$payload"
}

# Helper function to format bytes
format_bytes() {
    python3 -c "bytes=$1; print(f'{bytes/1024/1024/1024:.2f} GB' if bytes >= 1073741824 else f'{bytes/1024/1024:.2f} MB' if bytes >= 1048576 else f'{bytes/1024:.2f} KB' if bytes >= 1024 else f'{bytes} B')" 2>/dev/null || echo "$1 bytes"
}

# Get and display active downloads
echo -e "${GREEN}=== Active Downloads ===${NC}\n"
ACTIVE_RESPONSE=$(make_rpc_call "aria2.tellActive" "[]")
ACTIVE_COUNT=$(echo "$ACTIVE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('result', [])))" 2>/dev/null || echo "0")

if [ "$ACTIVE_COUNT" = "0" ]; then
    echo "No active downloads"
else
    echo "$ACTIVE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('result', []):
    name = t.get('bittorrent', {}).get('info', {}).get('name', 'Unknown')
    if not name or name == 'Unknown':
        files = t.get('files', [{}])
        if files:
            path = files[0].get('path', 'Unknown')
            name = path.split('/')[-1] if '/' in path else path
    
    completed = int(t.get('completedLength', 0))
    total = int(t.get('totalLength', 0))
    speed = int(t.get('downloadSpeed', 0))
    percent = (completed / total * 100) if total > 0 else 0
    
    speed_mb = speed / 1024 / 1024
    completed_gb = completed / 1024 / 1024 / 1024
    total_gb = total / 1024 / 1024 / 1024
    
    print(f'  📥 {name[:70]}')
    print(f'     Progress: {percent:.1f}% ({completed_gb:.2f} GB / {total_gb:.2f} GB)')
    print(f'     Speed: {speed_mb:.2f} MB/s')
    print(f'     GID: {t.get(\"gid\", \"unknown\")}')
    print()
" 2>/dev/null
fi

echo ""

# Get waiting downloads
echo -e "${YELLOW}=== Waiting Downloads ===${NC}\n"
WAITING_RESPONSE=$(make_rpc_call "aria2.tellWaiting" "0,100")
WAITING_COUNT=$(echo "$WAITING_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('result', [])))" 2>/dev/null || echo "0")

if [ "$WAITING_COUNT" = "0" ]; then
    echo "No waiting downloads"
else
    echo "$WAITING_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('result', []):
    name = t.get('bittorrent', {}).get('info', {}).get('name', 'Unknown')
    if not name or name == 'Unknown':
        files = t.get('files', [{}])
        if files:
            path = files[0].get('path', 'Unknown')
            name = path.split('/')[-1] if '/' in path else path
    print(f'  ⏳ {name[:70]}')
" 2>/dev/null
fi

echo ""

# Get stopped downloads (last 5)
echo -e "${RED}=== Recent Stopped Downloads (last 5) ===${NC}\n"
STOPPED_RESPONSE=$(make_rpc_call "aria2.tellStopped" "0,5")
STOPPED_COUNT=$(echo "$STOPPED_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('result', [])))" 2>/dev/null || echo "0")

if [ "$STOPPED_COUNT" = "0" ]; then
    echo "No stopped downloads"
else
    echo "$STOPPED_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data.get('result', [])[:5]:
    name = t.get('bittorrent', {}).get('info', {}).get('name', 'Unknown')
    if not name or name == 'Unknown':
        files = t.get('files', [{}])
        if files:
            path = files[0].get('path', 'Unknown')
            name = path.split('/')[-1] if '/' in path else path
    
    completed = int(t.get('completedLength', 0))
    total = int(t.get('totalLength', 0))
    percent = (completed / total * 100) if total > 0 else 0
    status = '✓ Complete' if percent >= 99.9 else f'{percent:.1f}%'
    print(f'  {status} - {name[:70]}')
" 2>/dev/null
fi

echo ""
