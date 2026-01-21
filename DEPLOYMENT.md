# Pokemon Leaf Green - Deployment Guide

This guide covers deploying the multiplayer Pokemon game using Docker and Docker Compose.

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Port 80 (HTTP) and 8080 (WebSocket) available

## Project Structure

```
pokemon-leaf-green/
├── client/                 # React frontend
│   ├── Dockerfile         # Multi-stage build with Nginx
│   ├── nginx.conf         # Nginx configuration
│   └── .env.example       # Environment variables template
├── server/                # Node.js WebSocket server
│   └── Dockerfile         # Node.js server container
├── docker-compose.yml     # Orchestration configuration
└── DEPLOYMENT.md          # This file
```

## Quick Start (Local Development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd pokemon-leaf-green
```

### 2. Configure Environment

```bash
# Client configuration
cd client
cp .env.example .env
# Edit .env if needed (defaults work for local)
cd ..
```

### 3. Build and Run

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 4. Access the Game

- **Game Client**: http://localhost
- **WebSocket Server**: ws://localhost:8080
- **Health Checks**:
  - Client: http://localhost/health
  - Server: http://localhost:8080/health

### 5. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f client
docker-compose logs -f server
```

### 6. Stop Services

```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v
```

## Production Deployment

### Option 1: Cloud VPS (DigitalOcean, AWS EC2, etc.)

#### 1. Server Setup

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### 2. Deploy Application

```bash
# Clone repository
git clone <repository-url>
cd pokemon-leaf-green

# Configure for production
cd client
nano .env
# Set: VITE_WS_URL=ws://your-domain.com:8080
# Or: VITE_WS_URL=wss://your-domain.com (if using SSL)

# Build and start
cd ..
docker-compose up -d --build
```

#### 3. Configure Firewall

```bash
# Allow HTTP and WebSocket ports
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

#### 4. Setup SSL (Recommended)

For production, use a reverse proxy with SSL:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Update client .env
VITE_WS_URL=wss://your-domain.com
```

### Option 2: Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml pokemon-game

# Check status
docker service ls
docker service logs pokemon-game_server
```

### Option 3: Kubernetes

Create Kubernetes manifests based on the Docker setup:

```yaml
# Example deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pokemon-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pokemon-server
  template:
    metadata:
      labels:
        app: pokemon-server
    spec:
      containers:
      - name: server
        image: your-registry/pokemon-server:latest
        ports:
        - containerPort: 8080
```

## Environment Variables

### Client (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_WS_URL` | WebSocket server URL | `ws://localhost:8080` | Yes |

### Server

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `production` | No |

## Monitoring

### Health Checks

Both services include health check endpoints:

```bash
# Client health
curl http://localhost/health

# Server health
curl http://localhost:8080/health
```

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats pokemon-client pokemon-server
```

## Troubleshooting

### Issue: WebSocket Connection Failed

**Solution**: Check that:
1. Server is running: `docker-compose ps`
2. Port 8080 is accessible
3. `VITE_WS_URL` in client/.env matches server address
4. Rebuild client after changing .env: `docker-compose up -d --build client`

### Issue: Client Shows Blank Page

**Solution**:
1. Check client logs: `docker-compose logs client`
2. Verify build completed: `docker-compose build client`
3. Check browser console for errors

### Issue: Players Not Syncing

**Solution**:
1. Check server logs: `docker-compose logs server`
2. Verify WebSocket connection in browser console
3. Restart services: `docker-compose restart`

### Issue: Port Already in Use

**Solution**:
```bash
# Change ports in docker-compose.yml
services:
  client:
    ports:
      - "3000:80"  # Instead of 80:80
  server:
    ports:
      - "8081:8080"  # Instead of 8080:8080
```

## Performance Optimization

### 1. Enable Gzip Compression

Already configured in `client/nginx.conf`

### 2. Cache Static Assets

Configured with 1-year cache for static assets

### 3. Optimize Images

```bash
# Install optimization tools in client Dockerfile if needed
RUN npm install -g imagemin-cli
```

### 4. Scale Server

```bash
# Run multiple server instances with load balancer
docker-compose up -d --scale server=3
```

## Backup and Updates

### Backup

No database needed - game state is ephemeral. Only backup:
- Source code
- Configuration files (.env)

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Or zero-downtime update
docker-compose up -d --no-deps --build client
docker-compose up -d --no-deps --build server
```

## Security Best Practices

1. **Use SSL/TLS in Production**
   - Use `wss://` instead of `ws://`
   - Use HTTPS for client

2. **Limit WebSocket Connections**
   - Add rate limiting to server
   - Implement connection timeouts

3. **Secure Environment Variables**
   - Never commit .env files
   - Use secrets management in production

4. **Regular Updates**
   ```bash
   # Update base images
   docker-compose pull
   docker-compose up -d --build
   ```

## CI/CD Pipeline Example

### GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build images
        run: docker-compose build

      - name: Push to registry
        run: |
          docker tag pokemon-client:latest registry.com/pokemon-client:${{ github.sha }}
          docker push registry.com/pokemon-client:${{ github.sha }}

      - name: Deploy to server
        run: |
          ssh user@server 'cd pokemon-leaf-green && git pull && docker-compose up -d --build'
```

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review this documentation
- Check Docker status: `docker ps`

## Cost Estimates

### Cloud Hosting (Monthly)

| Provider | Configuration | Est. Cost |
|----------|---------------|-----------|
| DigitalOcean | 1GB RAM, 1 vCPU | $6/month |
| AWS Lightsail | 1GB RAM, 1 vCPU | $5/month |
| Linode | 1GB RAM, 1 vCPU | $5/month |
| Heroku | Hobby tier | $7/month |

Recommended: **2GB RAM, 2 vCPU** for smooth multiplayer (~$12-15/month)

---

**Version**: 1.0.0
**Last Updated**: 2026-01-19
