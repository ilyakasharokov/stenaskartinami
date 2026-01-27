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
