# Drive Backend API - Linux Mint Setup Guide

Complete setup guide for deploying the Drive Backend API on Linux Mint with Docker Compose, PostgreSQL, Ollama AI, and Caddy reverse proxy.

## Table of Contents

- [Prerequisites](#prerequisites)
- [System Requirements](#system-requirements)
- [Installation Steps](#installation-steps)
- [Configuration](#configuration)
- [Starting the System](#starting-the-system)
- [Domain Setup with Caddy](#domain-setup-with-caddy)
- [Ollama Model Setup](#ollama-model-setup)
- [Managing the System](#managing-the-system)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- Linux Mint (tested on Mint 21.x)
- Root or sudo access
- A domain name pointing to your server's IP address (for HTTPS)
- Port forwarding configured on your router (ports 80, 443, and optionally 3001)

## System Requirements

- **RAM**: Minimum 4GB (8GB+ recommended for Ollama models)
- **Storage**: At least 10GB free space (more for larger Ollama models)
- **CPU**: Multi-core processor recommended
- **Network**: Static IP or dynamic DNS configured

## Installation Steps

### 1. Install Docker and Docker Compose

```bash
# Update package list
sudo apt update

# Install required packages
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker
```

### 2. Clone or Download the Project

```bash
# Navigate to your desired directory
cd ~/Desktop

# If using git:
# git clone <your-repo-url> cloudBE
# cd cloudBE

# Or extract your project files to ~/Desktop/cloudBE
```

### 3. Create Environment File

Create a `.env` file in the project root:

```bash
cd ~/Desktop/cloudBE
nano .env
```

Add the following configuration (adjust values as needed):

```env
# Environment
NODE_ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=drive_db
DB_USER=drive_user
DB_PASSWORD=your_secure_password_here

# API Configuration
API_PORT=3001

# JWT Configuration
JWT_SECRET=your_very_long_random_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=7d

# Google OAuth (Optional - leave empty if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://api.livingcloud.app/api/auth/google/callback

# Frontend Configuration
FRONTEND_URL=https://livingcloud.app
CORS_ORIGINS=https://livingcloud.app,http://localhost:5173

# Ollama Configuration
OLLAMA_BASE_URL=http://drive-ollama:11434
OLLAMA_MODEL=qwen2.5-coder:0.5b
```

**Important Security Notes:**
- Generate a strong `JWT_SECRET` using: `openssl rand -base64 32`
- Use a strong database password
- Never commit the `.env` file to version control

### 4. Create Storage Directories

```bash
mkdir -p ~/Desktop/cloudBE/storage/uploads
mkdir -p ~/Desktop/cloudBE/storage/thumbnails
chmod 755 ~/Desktop/cloudBE/storage/uploads
chmod 755 ~/Desktop/cloudBE/storage/thumbnails
```

### 5. Configure Caddy Reverse Proxy

Edit `Caddyfile.docker` and update the domain name:

```bash
nano ~/Desktop/cloudBE/Caddyfile.docker
```

Update the domain in the file (currently set to `api.livingcloud.app`):

```
api.yourdomain.com {
    # ... rest of configuration
}
```

## Starting the System

### 1. Build and Start All Services

```bash
cd ~/Desktop/cloudBE

# Build and start all containers
docker compose up -d --build

# Check status
docker compose ps
```

### 2. Verify Services are Running

```bash
# Check all container statuses
docker compose ps

# View logs
docker compose logs -f

# Check specific service logs
docker compose logs -f api
docker compose logs -f caddy
docker compose logs -f drive-ollama
```

### 3. Test the API

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test Ollama health
curl http://localhost:3001/api/ai/health
```

## Domain Setup with Caddy

### 1. Router Port Forwarding

Configure your router to forward ports to your Linux Mint server:

- **Port 80** (HTTP) → Your server's local IP
- **Port 443** (HTTPS) → Your server's local IP
- **Port 3001** (Optional, for direct API access) → Your server's local IP

**Example router configuration:**
- External Port: 80 → Internal IP: 192.168.1.100 → Internal Port: 80
- External Port: 443 → Internal IP: 192.168.1.100 → Internal Port: 443

### 2. DNS Configuration

Ensure your domain's DNS records point to your server's public IP:

- **A Record**: `api.yourdomain.com` → Your public IP address

You can check your public IP with:
```bash
curl ifconfig.me
```

### 3. Firewall Configuration

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp

# Optional: Allow direct API access
sudo ufw allow 3001/tcp

# Enable firewall (if not already enabled)
sudo ufw enable

# Check firewall status
sudo ufw status
```

### 4. Verify HTTPS Certificate

Caddy will automatically obtain SSL certificates from Let's Encrypt. Check logs:

```bash
docker compose logs caddy | grep -i certificate
```

If certificate acquisition fails, ensure:
- Ports 80 and 443 are accessible from the internet
- DNS is properly configured
- Domain is pointing to your server's IP

## Ollama Model Setup

### 1. List Available Models

```bash
docker compose exec drive-ollama ollama list
```

### 2. Pull a Model

```bash
# Pull a specific model (replace with your desired model)
docker compose exec drive-ollama ollama pull llama3.2:3b

# Other popular models:
# docker compose exec drive-ollama ollama pull llama3.2:1b
# docker compose exec drive-ollama ollama pull llama3.1:8b
# docker compose exec drive-ollama ollama pull qwen2.5:1.5b
```

### 3. Update Model Configuration

Edit `docker-compose.yml` and update the `OLLAMA_MODEL` environment variable:

```yaml
OLLAMA_MODEL: llama3.2:3b  # Change to your desired model
```

Then restart the API:

```bash
docker compose restart api
```

### 4. Check Model Status

```bash
# See which models are loaded in memory
docker compose exec drive-ollama ollama ps

# Test the AI endpoint
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "Hello, Markov!"}'
```

## Managing the System

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f caddy
docker compose logs -f drive-ollama
docker compose logs -f postgres

# Last 50 lines
docker compose logs --tail=50 api
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart api
docker compose restart caddy
```

### Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

### Update the System

```bash
# Pull latest images
docker compose pull

# Rebuild and restart
docker compose up -d --build
```

### Check Resource Usage

```bash
# Container resource usage
docker stats

# Specific container
docker stats drive-api
docker stats drive-ollama
```

## Troubleshooting

### API Returns 502 Bad Gateway

1. **Check if API container is running:**
   ```bash
   docker compose ps api
   ```

2. **Check API logs:**
   ```bash
   docker compose logs api --tail=50
   ```

3. **Verify Ollama model exists:**
   ```bash
   docker compose exec drive-ollama ollama list
   ```
   Ensure the model in `docker-compose.yml` matches an available model.

4. **Check database connection:**
   ```bash
   docker compose logs api | grep -i database
   ```

### Caddy Can't Obtain SSL Certificate

1. **Check port forwarding:**
   - Ensure ports 80 and 443 are forwarded on your router
   - Test with: `curl http://your-public-ip`

2. **Check DNS:**
   ```bash
   nslookup api.yourdomain.com
   ```
   Should return your server's public IP.

3. **Check Caddy logs:**
   ```bash
   docker compose logs caddy | grep -i certificate
   ```

4. **Verify firewall:**
   ```bash
   sudo ufw status
   ```

### Ollama Model Not Found

1. **Pull the model:**
   ```bash
   docker compose exec drive-ollama ollama pull MODEL_NAME
   ```

2. **Update docker-compose.yml:**
   ```yaml
   OLLAMA_MODEL: MODEL_NAME
   ```

3. **Restart API:**
   ```bash
   docker compose restart api
   ```

### Database Connection Issues

1. **Check PostgreSQL container:**
   ```bash
   docker compose ps postgres
   docker compose logs postgres
   ```

2. **Verify credentials in .env:**
   - Ensure `DB_USER`, `DB_PASSWORD`, and `DB_NAME` match

3. **Test database connection:**
   ```bash
   docker compose exec postgres psql -U drive_user -d drive_db
   ```

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using the port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3001

# Kill the process (replace PID with actual process ID)
sudo kill -9 PID
```

### Permission Denied Errors

```bash
# Ensure user is in docker group
sudo usermod -aG docker $USER
newgrp docker

# Fix storage directory permissions
sudo chown -R $USER:$USER ~/Desktop/cloudBE/storage
chmod -R 755 ~/Desktop/cloudBE/storage
```

## Useful Commands Reference

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs (follow mode)
docker compose logs -f

# Restart a service
docker compose restart SERVICE_NAME

# Rebuild and restart
docker compose up -d --build

# Check service status
docker compose ps

# Execute command in container
docker compose exec SERVICE_NAME COMMAND

# Pull Ollama model
docker compose exec drive-ollama ollama pull MODEL_NAME

# List Ollama models
docker compose exec drive-ollama ollama list

# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

## Support

For issues or questions:
- Check the logs: `docker compose logs -f`
- Verify configuration in `.env` and `docker-compose.yml`
- Ensure all prerequisites are met
- Check firewall and router port forwarding

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Use strong passwords for database and JWT secrets
- Regularly update Docker images: `docker compose pull`
- Keep your system updated: `sudo apt update && sudo apt upgrade`
- Monitor logs for suspicious activity
- Use HTTPS in production (Caddy handles this automatically)

---

**Last Updated**: December 2024
**Tested on**: Linux Mint 21.x

