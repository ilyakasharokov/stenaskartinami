# Deployment Guide

Step-by-step guide to deploy **api-v5** (Strapi) and **front** (Next.js) to production.

## Prerequisites

- SSH access to server: `ssh root@82.146.48.155` (or use `deploy` user with sudo)
- Git repository access

---

## 1. SSH into the server

```bash
ssh root@82.146.48.155
# OR
ssh deploy@82.146.48.155
```

---

## 2. Install Docker + Docker Compose

```bash
sudo apt update && sudo apt install -y ca-certificates curl gnupg lsb-release

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker && sudo systemctl start docker
```

**If using non-root user (e.g., `deploy`):**
```bash
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

---

## 3. Get the code onto the server

**Option A: Use /opt (requires sudo)**
```bash
cd /opt
sudo git clone <YOUR_REPO_URL> stenaskartinami
sudo chown -R $USER:$USER stenaskartinami
cd stenaskartinami
```

**Option B: Use home directory (no sudo needed)**
```bash
cd ~
git clone <YOUR_REPO_URL> stenaskartinami
cd stenaskartinami
```

---

## 4. Create production environment files

### `api-v5/.env`

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your_app_key_1,your_app_key_2
API_TOKEN_SALT=your_api_token_salt
ADMIN_JWT_SECRET=your_admin_jwt_secret
JWT_SECRET=your_jwt_secret

DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=stenaskartinami
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
```

### `front/.env`

```env
NEXT_PUBLIC_API_URL=http://82.146.48.155:1337/api
NEXTAUTH_URL=http://82.146.48.155:3000

# OAuth keys (if needed)
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
```

---

## 5. Update `docker-compose.prod.yml` to include frontend

Add the `front` service:

```yaml
  front:
    build:
      context: ./front
      dockerfile: dockerfile
    container_name: stenaskartinami-front
    restart: unless-stopped
    env_file:
      - ./front/.env
    ports:
      - "3000:3000"
    depends_on:
      - api-v5
```

**Note:** You'll also need to update `front/dockerfile` to use Node.js instead of nginx (see below).

---

## 6. Update `front/dockerfile` for Next.js

Replace the current dockerfile with:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start"]
```

---

## 7. Create uploads volume directory

```bash
sudo mkdir -p /home/stenaskartinami/api/public/uploads
sudo chown -R $USER:$USER /home/stenaskartinami
```

**Note:** If you don't have sudo access, you can use a directory in your home folder and update `docker-compose.prod.yml`:
```bash
mkdir -p ~/uploads
# Then update the volume path in docker-compose.prod.yml to: ~/uploads:/usr/src/app/public/uploads
```

---

## 8. Build and run everything

```bash
cd /opt/stenaskartinami  # or ~/stenaskartinami if using home directory
docker compose -f docker-compose.prod.yml up -d --build
```

**Note:** If you cloned to a different location, adjust the path accordingly.

---

## 9. Verify containers are running

```bash
docker ps
```

You should see:
- `stenaskartinami-postgres`
- `stenaskartinami-api-v5`
- `stenaskartinami-front`

---

## 10. Access your services

- **API:** `http://82.146.48.155:1337`
- **Frontend:** `http://82.146.48.155:3000`

---

## 10a. Troubleshooting: Port conflicts and nginx

If you previously ran the apps manually with Node.js or have nginx configured, you may need to:

### Check what's using ports 1337 and 3000:

```bash
sudo lsof -i :1337
sudo lsof -i :3000
# OR
sudo netstat -tlnp | grep -E ':(1337|3000)'
```

### Stop old Node.js processes:

```bash
# Find and kill old node processes
ps aux | grep node
sudo pkill -f "node.*1337"  # Kill API process
sudo pkill -f "node.*3000"  # Kill frontend process
# OR if using PM2
pm2 stop all
pm2 delete all
```

### Check nginx status and configs:

```bash
sudo systemctl status nginx
sudo nginx -t  # Test config
ls -la /etc/nginx/sites-enabled/
```

### Option A: Disable nginx (if you want direct Docker access):

```bash
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### Option B: Update nginx to proxy to Docker containers:

If you want to keep nginx, update your nginx configs to proxy to `localhost:1337` and `localhost:3000` (Docker containers expose these ports).

Example nginx config (`/etc/nginx/sites-available/stenaskartinami`):

```nginx
server {
    listen 80;
    server_name 82.146.48.155;

    # API proxy
    location /api {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then:
```bash
sudo ln -s /etc/nginx/sites-available/stenaskartinami /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Check Docker containers are running:

```bash
docker ps
docker compose -f docker-compose.prod.yml logs api-v5
docker compose -f docker-compose.prod.yml logs front
```

### Check firewall (if enabled):

```bash
sudo ufw status
# If needed, allow ports:
sudo ufw allow 1337/tcp
sudo ufw allow 3000/tcp
```

---

## 11. Restore database (if needed)

If you have a database dump:

```bash
# Copy dump to server
scp dump/stenaskartinami.dump deploy@82.146.48.155:/tmp/

# On server, restore
docker cp /tmp/stenaskartinami.dump stenaskartinami-postgres:/tmp/
docker exec -it stenaskartinami-postgres pg_restore -U postgres -d stenaskartinami -v /tmp/stenaskartinami.dump
```

---

## Useful commands

**View logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f
```

**Restart services:**
```bash
docker compose -f docker-compose.prod.yml restart
```

**Stop services:**
```bash
docker compose -f docker-compose.prod.yml down
```

**Rebuild after code changes:**
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Optional: Setup reverse proxy (nginx/caddy)

For production with SSL, set up a reverse proxy to route:
- `https://api.yourdomain.com` → `api-v5:1337`
- `https://yourdomain.com` → `front:3000`

---

## Setup domains with nginx and SSL

This section covers setting up both:
- `api.stenaskartinami.com` → API (port 1337)
- `stenaskartinami.com` → Frontend (port 3000)

### 1. DNS Configuration

Point your domains to the server IP:

**For API subdomain:**
- **Type:** A
- **Name:** `api`
- **Value:** `82.146.48.155`
- **TTL:** 3600 (or default)

**For main domain:**
- **Type:** A
- **Name:** `@` (or blank/root)
- **Value:** `82.146.48.155`
- **TTL:** 3600 (or default)

**For www subdomain (optional but recommended):**
- **Type:** A
- **Name:** `www`
- **Value:** `82.146.48.155`
- **TTL:** 3600 (or default)

Wait for DNS propagation (can take a few minutes to hours). Verify with:
```bash
dig api.stenaskartinami.com
dig stenaskartinami.com
```

### 2. Install nginx and certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3. Create nginx configuration

Create `/etc/nginx/sites-available/api.stenaskartinami.com`:

```nginx
server {
    listen 80;
    server_name api.stenaskartinami.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.stenaskartinami.com;

    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/api.stenaskartinami.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.stenaskartinami.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Increase body size for file uploads
    client_max_body_size 100M;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 4. Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/api.stenaskartinami.com /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
```

### 5. Get SSL certificate with Let's Encrypt

```bash
sudo certbot --nginx -d api.stenaskartinami.com
```

Follow the prompts. Certbot will automatically:
- Obtain the certificate
- Update nginx config with SSL settings
- Set up auto-renewal

### 6. Reload nginx

```bash
sudo systemctl reload nginx
```

### 7. Verify SSL auto-renewal

```bash
sudo certbot renew --dry-run
```

### 8. Setup frontend domain (stenaskartinami.com)

Create `/etc/nginx/sites-available/stenaskartinami.com` (or copy the template):

```bash
sudo cp /opt/stenaskartinami/nginx-stenaskartinami.com.conf /etc/nginx/sites-available/stenaskartinami.com
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/stenaskartinami.com /etc/nginx/sites-enabled/
sudo nginx -t
```

Get SSL certificate for main domain:

```bash
sudo certbot --nginx -d stenaskartinami.com -d www.stenaskartinami.com
```

Reload nginx:

```bash
sudo systemctl reload nginx
```

### 9. Update frontend .env

Update `front/.env` on the server:

```env
NEXT_PUBLIC_API_URL=https://api.stenaskartinami.com/api
NEXTAUTH_URL=https://stenaskartinami.com
```

Then restart the frontend container:

```bash
docker compose -f docker-compose.prod.yml restart front
```

### 10. Test

- Visit `https://api.stenaskartinami.com` - you should see the Strapi admin or API response
- Visit `https://stenaskartinami.com` - you should see your frontend

### Troubleshooting

**Check nginx status:**
```bash
sudo systemctl status nginx
sudo nginx -t
```

**Check nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**Check if Docker container is listening:**
```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost:1337
```

**Check DNS:**
```bash
dig api.stenaskartinami.com
# or
nslookup api.stenaskartinami.com
```

---

## API: "Knex: Timeout acquiring a connection" (database)

If api-v5 logs show this error:

1. **Confirm .env on server:**
   - `DATABASE_HOST=postgres` (not 127.0.0.1)
   - Or set: `DATABASE_URL=postgres://postgres:postgres@postgres:5432/stenaskartinami`

2. **Kill stuck connections and restart:**
```bash
docker exec -it stenaskartinami-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'stenaskartinami' AND pid <> pg_backend_pid();"
docker compose -f docker-compose.prod.yml stop api-v5
sleep 5
docker compose -f docker-compose.prod.yml up -d api-v5
```

3. **Full rebuild (no cache) so config changes are applied:**
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache api-v5
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f api-v5
```

4. **Check what the container sees:**
```bash
docker exec -it stenaskartinami-api-v5 env | grep DATABASE
```
