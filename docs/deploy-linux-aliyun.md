# Deployment Guide — Alibaba Cloud (Aliyun) Linux Server

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (static files served by Nginx) |
| Backend | Node.js + Express (managed by PM2) |
| Database | PostgreSQL |
| Cache | Redis |
| Reverse Proxy | Nginx |
| File Storage | Cloudinary (cloud, no local config needed) |

---

## 1. Provision the ECS Instance

1. Log in to [Aliyun ECS Console](https://ecs.console.aliyun.com).
2. Create an instance:
   - **OS**: Ubuntu 22.04 LTS (recommended)
   - **CPU/RAM**: 2 vCPU / 4 GB minimum for production
   - **Storage**: 40 GB system disk
3. In the **Security Group**, open inbound ports:
   - `22` — SSH
   - `80` — HTTP
   - `443` — HTTPS
4. Assign an **Elastic IP (EIP)** to the instance.
5. Point your domain's A record to the EIP.

---

## 2. Initial Server Setup

```bash
# SSH into the server
ssh root@<your-server-ip>

# Update packages
apt update && apt upgrade -y

# Create a non-root deploy user
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Switch to deploy user for all remaining steps
su - deploy
```

---

## 3. Install Dependencies

```bash
# Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # v20.x.x
npm -v

# PM2 (process manager)
sudo npm install -g pm2

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Redis
sudo apt install -y redis-server

# Nginx
sudo apt install -y nginx

# Git
sudo apt install -y git
```

---

## 4. Configure PostgreSQL

```bash
sudo -u postgres psql

-- Inside psql:
CREATE USER arttherapy WITH PASSWORD 'your_strong_password';
CREATE DATABASE arttherapy_db OWNER arttherapy;
GRANT ALL PRIVILEGES ON DATABASE arttherapy_db TO arttherapy;
\q
```

Test the connection:

```bash
psql -U arttherapy -d arttherapy_db -h 127.0.0.1
```

---

## 5. Configure Redis

```bash
sudo nano /etc/redis/redis.conf
```

Set a password (recommended):

```
requirepass your_redis_password
```

Restart Redis:

```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

---

## 6. Clone the Repository

```bash
cd /home/deploy
git clone https://github.com/<your-org>/<your-repo>.git art-therapy
cd art-therapy
```

---

## 7. Configure Environment Variables

### Server

```bash
cp server/.env.example server/.env   # or create from scratch
nano server/.env
```

Minimum required variables:

```env
NODE_ENV=production
PORT=5000

DATABASE_URL=postgresql://arttherapy:your_strong_password@127.0.0.1:5432/arttherapy_db

REDIS_URL=redis://:your_redis_password@127.0.0.1:6379

JWT_SECRET=replace_with_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

CLIENT_URL=https://yourdomain.com
```

### Client

```bash
nano client/.env.production
```

```env
VITE_API_URL=https://yourdomain.com/api
```

---

## 8. Build and Deploy the Backend

```bash
cd /home/deploy/art-therapy/server

# Install dependencies (production only)
npm ci --omit=dev

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build TypeScript
npm run build
```

Start with PM2:

```bash
pm2 start dist/server.js --name art-therapy-api --env production

# Save PM2 process list so it restarts on reboot
pm2 save
pm2 startup   # follow the printed command to enable autostart
```

---

## 9. Build the Frontend

```bash
cd /home/deploy/art-therapy/client

npm ci

npm run build
# Output is in: client/dist/
```

---

## 10. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/art-therapy
```

Paste the following (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Serve React frontend
    root /home/deploy/art-therapy/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Express
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size limit (for artwork uploads)
    client_max_body_size 20M;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/art-therapy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Obtain SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot auto-renews. Verify the timer:

```bash
sudo systemctl status certbot.timer
```

---

## 12. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 13. Verify the Deployment

```bash
# Check PM2 process
pm2 status
pm2 logs art-therapy-api --lines 50

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql

# Check Redis
redis-cli -a your_redis_password ping   # should return PONG

# Hit the health endpoint
curl https://yourdomain.com/api/health
```

---

## 14. Updating the Application

```bash
cd /home/deploy/art-therapy

# Pull latest code
git pull origin main

# Backend update
cd server
npm ci --omit=dev
npx prisma migrate deploy
npm run build
pm2 restart art-therapy-api

# Frontend update
cd ../client
npm ci
npm run build
# Nginx serves the new dist/ automatically — no restart needed
```

---

## 15. Useful PM2 Commands

```bash
pm2 list                        # list all processes
pm2 logs art-therapy-api        # tail logs
pm2 restart art-therapy-api     # restart
pm2 stop art-therapy-api        # stop
pm2 monit                       # live dashboard
```

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| 502 Bad Gateway | `pm2 logs` — backend may have crashed |
| DB connection error | Verify `DATABASE_URL` and PostgreSQL is running |
| Redis connection error | Verify `REDIS_URL` password matches `redis.conf` |
| Static files 404 | Confirm `client/dist` path in Nginx `root` directive |
| SSL errors | Run `sudo certbot renew --dry-run` |
