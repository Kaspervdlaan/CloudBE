#!/bin/bash

# Database setup script for Drive Backend
# This script creates the PostgreSQL database and user if they don't exist

# Load environment variables from .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_NAME=${DB_NAME:-drive_db}
DB_USER=${DB_USER:-drive_user}
DB_PASSWORD=${DB_PASSWORD:-drive_password}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "Setting up PostgreSQL database..."
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"

# Check if user exists, create if not
echo "Creating PostgreSQL user '$DB_USER' if it doesn't exist..."
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1
if [ $? -ne 0 ]; then
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
    echo "User '$DB_USER' created successfully"
else
    echo "User '$DB_USER' already exists"
fi

# Check if database exists, create if not
echo "Creating database '$DB_NAME' if it doesn't exist..."
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1
if [ $? -ne 0 ]; then
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo "Database '$DB_NAME' created successfully"
else
    echo "Database '$DB_NAME' already exists"
fi

echo "Database setup complete!"
echo "You can now start the server with: npm run dev"

