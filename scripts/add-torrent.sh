#!/bin/bash

# aria2 Torrent Adder Script
# Usage: ./add-torrent.sh <magnet-link> [save-path]

# Try to load variables from .env file if they're not already set
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ] && [ -z "$ARIA2_RPC_SECRET" ]; then
    # Extract ARIA2_RPC_SECRET from .env if not already set
    ARIA2_RPC_SECRET=$(grep -E '^ARIA2_RPC_SECRET=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    export ARIA2_RPC_SECRET
fi
if [ -f "$PROJECT_ROOT/.env" ] && [ -z "$ARIA2_RPC_URL" ]; then
    # Extract ARIA2_RPC_URL from .env if not already set
    ARIA2_RPC_URL=$(grep -E '^ARIA2_RPC_URL=' "$PROJECT_ROOT/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    export ARIA2_RPC_URL
fi

# Configuration (with defaults)
ARIA2_RPC_URL="${ARIA2_RPC_URL:-http://localhost:6800/jsonrpc}"
ARIA2_RPC_SECRET="${ARIA2_RPC_SECRET:-}"
DEFAULT_SAVE_PATH="/data/movies"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if magnet link is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Magnet link is required${NC}"
    echo "Usage: $0 <magnet-link> [save-path]"
    echo "Example: $0 'magnet:?xt=urn:btih:...' /data/movies"
    exit 1
fi

MAGNET_LINK="$1"
SAVE_PATH="${2:-$DEFAULT_SAVE_PATH}"

# Validate magnet link
if [[ ! "$MAGNET_LINK" =~ ^magnet: ]]; then
    echo -e "${RED}Error: Invalid magnet link. Must start with 'magnet:'${NC}"
    exit 1
fi

# Generate a random ID for the JSON-RPC call
RPC_ID="add_$(date +%s)_$$"

# Build JSON-RPC request based on whether RPC secret is set
if [ -z "$ARIA2_RPC_SECRET" ]; then
    echo -e "${YELLOW}Warning: ARIA2_RPC_SECRET not set. Using unauthenticated RPC.${NC}"
    # No authentication - params start with the URI array
    JSON_PAYLOAD=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "aria2.addUri",
  "id": "${RPC_ID}",
  "params": [
    ["${MAGNET_LINK}"],
    {
      "dir": "${SAVE_PATH}"
    }
  ]
}
EOF
)
else
    # With authentication - token is first param
    JSON_PAYLOAD=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "aria2.addUri",
  "id": "${RPC_ID}",
  "params": [
    "token:${ARIA2_RPC_SECRET}",
    ["${MAGNET_LINK}"],
    {
      "dir": "${SAVE_PATH}"
    }
  ]
}
EOF
)
fi

echo -e "${YELLOW}Adding torrent to aria2...${NC}"
echo -e "Magnet: ${MAGNET_LINK:0:60}..."
echo -e "Save path: ${SAVE_PATH}"

# Make the JSON-RPC call
RESPONSE=$(curl -s -X POST "$ARIA2_RPC_URL" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")

# Check if curl was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to connect to aria2 RPC${NC}"
    echo "Make sure aria2 container is running and RPC is accessible at $ARIA2_RPC_URL"
    exit 1
fi

# Check for errors in response
if echo "$RESPONSE" | grep -q '"error"'; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    ERROR_CODE=$(echo "$RESPONSE" | grep -o '"code":[0-9]*' | cut -d':' -f2)
    echo -e "${RED}Error: aria2 RPC returned an error${NC}"
    echo "Error code: $ERROR_CODE"
    echo "Error message: $ERROR_MSG"
    exit 1
fi

# Check if we got a GID (download ID) back
GID=$(echo "$RESPONSE" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

if [ -n "$GID" ]; then
    echo -e "${GREEN}✓ Torrent added successfully!${NC}"
    echo "Download GID: $GID"
    exit 0
else
    echo -e "${RED}Error: Unexpected response from aria2${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

