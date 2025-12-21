# Drive Backend API

Backend API for Drive application built with Node.js, Express, TypeScript, and PostgreSQL.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

The `.env` file should already be configured. If you need to set up the database and user manually:

```bash
# Run the database setup script (requires sudo)
./setup-db.sh
```

Or manually:

```bash
# Create PostgreSQL user
sudo -u postgres psql -c "CREATE USER drive_user WITH PASSWORD 'drive_password';"
sudo -u postgres psql -c "ALTER USER drive_user CREATEDB;"

# Create database
sudo -u postgres psql -c "CREATE DATABASE drive_db OWNER drive_user;"
```

Note: The application will attempt to create the database automatically on startup if it has the necessary permissions.

### 3. Environment Variables

The `.env` file contains the following configuration:

- **Database**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **API**: `API_PORT`, `NODE_ENV`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Google OAuth** (optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- **Frontend**: `FRONTEND_URL`, `CORS_ORIGINS`

### 4. Start the Development Server

```bash
npm run dev
```

The server will:
- Initialize storage directories (`./storage/uploads` and `./storage/thumbnails`)
- Initialize the database schema
- Start listening on port 3001 (or `API_PORT` from .env)

### 5. Verify Setup

Check the health endpoint:

```bash
curl http://localhost:3001/health
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server (requires build first)
- `npm run migrate` - Run database migrations
- `npm run create-admin` - Create an admin user
- `npm run create-test-account` - Create a test account
- `npm run add-test-data` - Add test data to the database

## API Endpoints

- `GET /health` - Health check
- `/api/auth/*` - Authentication endpoints
- `/api/files/*` - File management endpoints

## Project Structure

```
src/
├── config/          # Database and configuration
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/          # Data models
├── routes/          # API routes
├── scripts/         # Utility scripts
├── types/           # TypeScript types
├── utils/           # Utility functions
└── index.ts         # Application entry point
```

## Database

The database schema is defined in `src/config/database.sql` and is automatically initialized when the server starts.
