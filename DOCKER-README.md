# Docker Quick Reference

## Common Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build
```

### Check Service Status
```bash
docker-compose ps
```

### Restart a Service
```bash
docker-compose restart client
docker-compose restart server
```

### Access Running Container
```bash
docker exec -it pokemon-client sh
docker exec -it pokemon-server sh
```

### Clean Up Everything
```bash
docker-compose down -v --rmi all
```

## Ports

- **Client**: http://localhost (port 80)
- **Server**: ws://localhost:8080 (port 8080)

## Health Checks

- Client: http://localhost/health
- Server: http://localhost:8080/health

## Environment Setup

```bash
cd client
cp .env.example .env
# Edit .env for production deployment
```

---

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
