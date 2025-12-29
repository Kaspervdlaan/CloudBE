#!/bin/bash

# Helper script to set a user as admin in Docker container
# Usage: ./set-admin-docker.sh <email>

if [ -z "$1" ]; then
    echo "Usage: $0 <email>"
    echo "Example: $0 hans@niels.nl"
    exit 1
fi

EMAIL="$1"

echo "Setting $EMAIL as admin..."

docker compose exec -T postgres psql -U drive_user -d drive_db -c "UPDATE users SET role = 'admin' WHERE email = '$EMAIL'; SELECT email, role FROM users WHERE email = '$EMAIL';"

if [ $? -eq 0 ]; then
    echo "✅ Successfully set $EMAIL as admin"
else
    echo "❌ Failed to set admin status"
    exit 1
fi

