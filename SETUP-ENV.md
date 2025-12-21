# Environment Variables Setup

This file contains the environment variables you need to set for the application to work.

## Backend Environment Variables

Create a `.env` file in the root directory or set these as environment variables:

```bash
# Database Configuration
DB_NAME=drive_db
DB_USER=drive_user
DB_PASSWORD=drive_password
DB_PORT=5432

# API Configuration
API_PORT=3001
NODE_ENV=development

# Google OAuth Configuration
# Get these from Google Cloud Console: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://api.livingcloud.app/api/auth/google/callback

# Frontend Configuration
FRONTEND_URL=https://livingcloud.app
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5174,https://livingcloud.app

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-use-strong-random-string
JWT_EXPIRES_IN=7d
```

## Frontend Environment Variables (Netlify)

In Netlify Dashboard → Site Settings → Environment Variables, add:

- **Key:** `VITE_API_URL`
- **Value:** `https://api.livingcloud.app/api`

## Important Notes

- Never commit `.env` files to git
- The `.env` file is already in `.gitignore`
- For production, use strong, randomly generated values for `JWT_SECRET`
- Update `GOOGLE_CALLBACK_URL` if your public IP changes

