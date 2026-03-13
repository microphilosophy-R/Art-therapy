# Deployment Guide — Alibaba Cloud (Aliyun) Linux Server (Beginner Friendly)

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (static files served by Nginx) |
| Backend | Node.js + Express (managed by PM2) |
| Database | PostgreSQL |
| Cache | Redis |
| Reverse Proxy | Nginx |
| Process Manager| PM2 |

---

## 1. Provision the ECS Instance

1. Log in to [Aliyun ECS Console](https://ecs.console.aliyun.com).
2. Create an instance:
   - **OS**: Ubuntu 22.04 LTS (recommended)
   - **CPU/RAM**: 2 vCPU / 4 GB minimum for production
   - **Storage**: 40 GB system disk
3. In the **Security Group (Important)**, open inbound ports:
   - `22` — SSH
   - `80` — HTTP (Required for website to load)
   - `443` — HTTPS (Required for SSL)
4. Assign an **Elastic IP (EIP)** to the instance.
5. Point your domain's A record (e.g. `luyin.xyz` and `www.luyin.xyz`) to the EIP in your DNS settings.

---

## 2. Server Setup and User Permissions

Log into your server via SSH. On Aliyun, you typically start as the `root` user or `admin` user. 

```bash
# SSH into the server as root
ssh root@<your-server-ip>

# Update packages
apt update && apt upgrade -y
```

### ⚠️ IMPORTANT: Understanding Your Paths
Your application files need to be stored somewhere. If you are logged in as `admin`, your home directory is `/home/admin`. If you are logged in as `deploy`, it is `/home/deploy`. If you are `root`, it is `/root`.
**Keep track of your absolute path**! This guide uses `/home/admin` as an example (i.e. we assume you deploy your app to `/home/admin/art-therapy`). Adjust your commands if your username is different.

If you want to create a non-root user (e.g. `admin`):
```bash
adduser admin
usermod -aG sudo admin
su - admin  # Switch to admin user for the remaining steps!
```

---

## 3. Install Dependencies

Install the core software required to run the stack.

```bash
# 1. Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node installation
node -v   # Should output v20.x.x

# 2. PM2 (Process manager for Node.js)
sudo npm install -g pm2

# 3. PostgreSQL Database
sudo apt install -y postgresql postgresql-contrib

# 4. Redis Server
sudo apt install -y redis-server

# 5. Nginx Web Server
sudo apt install -y nginx

# 6. Git
sudo apt install -y git
```

---

## 4. Configure PostgreSQL

```bash
sudo -u postgres psql

-- Inside the PostgreSQL console (psql), run:
CREATE USER arttherapy WITH PASSWORD 'your_strong_password';
CREATE DATABASE arttherapy_db OWNER arttherapy;
GRANT ALL PRIVILEGES ON DATABASE arttherapy_db TO arttherapy;
\q
```

*Test the connection:*
```bash
psql -U arttherapy -d arttherapy_db -h 127.0.0.1
```

---

## 5. Configure Redis

```bash
sudo nano /etc/redis/redis.conf
```

Find the `requirepass` directive, uncomment it, and set a password (optional but recommended):
```text
requirepass your_redis_password
```

Restart Redis to apply changes:
```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

---

## 6. Clone the Repository

Make sure you are in your user's home directory (e.g., `/home/admin`).

```bash
cd ~
pwd  # Double check that you are in /home/admin or your respective user folder.

git clone https://github.com/<your-org>/<your-repo>.git art-therapy
cd art-therapy
```

---

## 7. Configure Environment Variables

### Backend Server (`server/.env`)

```bash
cd ~/art-therapy/server
cp .env.example .env
nano .env
```

Ensure these core variables are set properly:

```env
NODE_ENV="production"
PORT=3001

# Update with the DB details from step 4
DATABASE_URL="postgresql://arttherapy:your_strong_password@127.0.0.1:5432/arttherapy_db"

# Update with the Redis password from step 5
REDIS_URL="redis://:your_redis_password@127.0.0.1:6379"

# Generate some random, strong secrets
JWT_ACCESS_SECRET="generate_a_very_long_random_string_here"
JWT_REFRESH_SECRET="generate_another_long_random_string_here"

# Set your actual domain
CLIENT_URL="http://luyin.xyz" # Update to https:// after SSL is connected

# IMPORTANT: Ensure Cloudinary credentials are empty for local storage
CLOUDINARY_CLOUD_NAME=
SERVER_URL="http://luyin.xyz" # Change to https:// later
```

### Frontend Client (`client/.env.production`)

```bash
cd ~/art-therapy/client
nano .env.production
```

**CRITICAL FIX FOR CORS / IP TESTING:**
Instead of hardcoding your domain, use a relative path. This allows you to test the website using the raw server IP address (`http://47.117...)` without triggering CORS errors while you wait for your domain to propagate.

```env
VITE_API_URL=/api/v1
```

---

## 8. Build and Deploy the Backend

```bash
cd ~/art-therapy/server

# Install dependencies (production only)
npm ci --omit=dev

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build TypeScript
npm run build
```

The backend build is a bundled artifact: `dist/server.js`. The build script cleans `dist/` first; do not expect `dist/controllers/` files.

Start the application using PM2. *(Note we use port 3001 as defined in the server's `.env`)*:

```bash
pm2 start dist/server.js --name art-therapy-api --env production

# Save PM2 process list so it restarts automatically on server reboot
pm2 save
pm2 startup   
# NOTE: copy and run the exact command PM2 prints in the console!
```

---

## 9. Professional Persistence: Persistent Storage (Clean Deploys)

To ensure your images/videos aren't deleted when you update or reinstall the app, we store them in a permanent folder outside the code directory.

### Why this works with Zero Code Changes:
We use a **symbolic link** (a "shortcut"). The code looks for a folder named `uploads` inside the app. We create a link named `uploads` that points to a real folder at `/var/www/art-therapy-uploads`. The code never knows the difference!

```bash
# 1. Create a permanent folder outside the app
sudo mkdir -p /var/www/art-therapy-uploads
sudo chown -R admin:admin /var/www/art-therapy-uploads

# 2. Link it to your application
cd ~/art-therapy/server
# Remove the existing uploads folder if it exists
rm -rf uploads
# Create the link (shortcut)
ln -s /var/www/art-therapy-uploads uploads

# Verify the link works (should show /var/www/art-therapy-uploads)
ls -ld uploads
```

---

## 10. Seed the Database (Optional but Recommended)

If this is your first time deploying and you want to populate your database with initial data (therapists, plans, etc.), run the seed script now.

**⚠️ IMPORTANT**: We are running the seed script *after* setting up persistent storage (Step 9). This guarantees that if your seed script automatically generates any images, they will correctly be placed into the permanent `/var/www` folder instead of being deleted later!

```bash
cd ~/art-therapy/server

# 1. Temporarily install the TypeScript executor (since we omitted 'dev' dependencies in Step 8)
npm install -D tsx

# 2. Run the seed file directly
# (This bypasses the missing "prisma.seed" package.json config error)
npx --yes tsx prisma/seed.ts

# 3. Clean up the dev dependencies again to save server memory
npm ci --omit=dev
```

If you see `spawn tsx ENOENT`, run:

```bash
npm install -D tsx
npx --yes tsx prisma/seed.ts
```

---

## 11. Build the Frontend

```bash
cd ~/art-therapy/client

# Install dependencies
npm ci

# Build the static site
npm run build

# The output folder will be: /home/admin/art-therapy/client/dist/
```

---

## 12. Configure Nginx

Nginx handles routing web traffic to your static frontend files and backend API.

### ⚠️ Common Pitfalls for Beginners:
1. **Wrong root path:** Your `root` directive MUST perfectly match your absolute directory path. If you are using the `admin` user, it should be `/home/admin/art-therapy/client/dist`. Run `pwd` in the `client/dist` folder to confirm this path.
2. **Missing backend routes:** The backend utilizes `/api/`, `/webhooks/`, `/uploads/`, and `/health`. Nginx must be configured to pass **all** of these, not just `/api/v1/`. Otherwise webhooks and uploads will fail.
3. **Missing Socket.IO route:** Realtime chat requires `/socket.io/` websocket upgrade proxy. If omitted, browser will show websocket closed/failed errors.
3. **Trailing slashes in proxy_pass:** Do **NOT** add trailing slashes or URI paths when using `proxy_pass http://127.0.0.1:3001;`. Let Nginx simply forward the path as-is.

Create a new configuration file:
```bash
# We use the conf.d folder as it's the standard for Aliyun's Ubuntu/CentOS images
sudo nano /etc/nginx/conf.d/art-therapy.conf
```

**⚠️ CRITICAL:** Ensure the file contains **ONLY** the `server { ... }` block below. If you see `[cite:` or `Step ID` anywhere, delete those lines immediately.

**Paste the following configuration (Replace `luyin.xyz` with your domain and `/home/admin` with your actual username path!):**

```nginx
server {
    listen 80;
    server_name luyin.xyz www.luyin.xyz;

    root /home/admin/art-therapy/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias /var/www/art-therapy-uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location ~ ^/(api|webhooks|health)/? {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO realtime chat
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

Enable the site and test Nginx:

### 🧹 Step 1: Deep Clean (Fixes "conflicting server name" and "cite" errors)
Run these commands to remove all the "phantom" files causing your errors:
```bash
# Delete the file causing your specific "cite" error
sudo rm -f /etc/nginx/conf.d/art-therapy.conf
sudo rm -f /etc/nginx/art-therapy

# Delete the default files causing the "_" conflict
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/default
sudo rm -f /etc/nginx/conf.d/default.conf
```

### 📝 Step 2: Create the Clean Config
Now create the file again, making sure it is **100% clean**:
```bash
sudo nano /etc/nginx/conf.d/art-therapy.conf
```
*(Paste the clean `server { ... }` block from the box above. Save with Ctrl+O, Enter, and exit with Ctrl+X.)*

### 🚀 Step 3: Test and Reload
```bash
# Test Nginx syntax
sudo nginx -t

# If syntax is OK, apply the changes
sudo systemctl reload nginx
```

### ❓ Troubleshooting "Unknown Directive [cite:"
The error `/etc/nginx/conf.d/art-therapy.conf:2` means there is extra text on line 2 of your file.
1. Run `sudo nano /etc/nginx/conf.d/art-therapy.conf`.
2. Look at the very top. If you see `[cite:]` or `Step ID`, delete them!
3. The file **must** begin with `server {`.

---

## 13. Testing & Troubleshooting (Pre-SSL)

At this point, visiting `http://luyin.xyz` should load your React app. If it doesn't, but the IP address (`http://47.117.137.126`) works perfectly, you have a **Domain/DNS Issue**.

### 🔍 If the IP works but the Domain fails:
1. **DNS Propagation:** It can take up to 24-48 hours for a newly changed "A Record" to propagate across the global internet. You can check the status at [DNSChecker.org](https://dnschecker.org) (Search for `luyin.xyz` and ensure it points to your server IP).
2. **Alibaba Cloud ICP Filing (备案) ⚠️:** If your Aliyun server is located in Mainland China (e.g., Beijing, Shanghai, Hangzhou) instead of Hong Kong or Singapore, Alibaba Cloud actively blocks **ALL** domain web traffic (Port 80 and 443) until you complete an official ICP Filing (Website Record).
   - If you visit `http://luyin.xyz` and see a Chinese warning page saying "网站未备案" (Unregistered Website), this is the reason. Note: You cannot bypass this by changing Nginx. You must complete the filing process in the Aliyun Console.

### 🔍 Other Common Errors:
1. **Check Nginx access & error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```
   *If you see "Permission denied" in `error.log`, Nginx can't read your frontend folder. Fix it by running: `chmod +x /home/admin` and `chmod +xd /home/admin/art-therapy`.*

2. **Verify Backend is working globally:**
   ```bash
   curl http://127.0.0.1:3001/health
   # You should get a JSON response like {"status":"ok", "ts":"..."}
   ```

3. **Verify Socket.IO endpoint is reachable (chat realtime):**
   ```bash
   # Should return a 400 JSON payload from Socket.IO (this is expected without full handshake)
   curl -i "http://127.0.0.1/socket.io/?EIO=4&transport=polling"
   ```
   If you get `404`/`502`, your Nginx `location /socket.io/` is missing or broken.

---

## 14. Obtain SSL Certificate (Let's Encrypt / HTTPS)

Once HTTP is working natively, secure the site.

```bash
sudo apt install -y certbot python3-certbot-nginx

# Certbot will automatically edit your Nginx config to add SSL
sudo certbot --nginx -d luyin.xyz -d www.luyin.xyz
```

After enabling SSL, go back and update your `.env` files to use `https://` instead of `http://` and restart PM2 and rebuild the frontend.

```bash
cd ~/art-therapy/server
nano .env # Change CLIENT_URL and SERVER_URL to https://luyin.xyz
pm2 restart art-therapy-api

cd ~/art-therapy/client
nano .env.production # Change VITE_API_URL to https://luyin.xyz/api/v1
npm run build
```

---

## 15. Firewall setup (UFW)

Ensure basic server security by turning on a firewall.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 16. Managing Updates Later

Whenever you push new code to GitHub and want to update the server:

```bash
cd ~/art-therapy
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
# Server Update Workflow (Aliyun Deployment)

Once your application is live, you will frequently need to push new features and bug fixes from your local machine to the server. 

This document outlines the standard workflow for safely updating your live server without causing downtime.

---

## The Manual Update Workflow

Whenever you push new code to the `main` branch on GitHub, log into your Aliyun server and run these commands in order.

### Step 1: Pull the Latest Code
```bash
cd ~/art-therapy

# Discard any accidental local changes on the server and pull fresh code
git reset --hard HEAD
git pull origin main
```

### Step 2: Update the Backend (API & Database)
```bash
cd ~/art-therapy/server

# Install any new dependencies (production only)
npm ci --omit=dev

# Generate the PRISMA client (Crucial if schema.prisma changed)
npx prisma generate

# Apply any new database migrations safely
npx prisma migrate deploy

# Rebuild the TypeScript code into JavaScript
npm run build

# Restart the Node.js process gracefully
pm2 restart art-therapy-api
```

Runtime target remains `dist/server.js` (single bundle).

### Step 3: Update the Frontend (React App)
```bash
cd ~/art-therapy/client

# Install frontend dependencies
npm ci

# Build the new static React site into the `dist/` folder
npm run build
```
*(Note: You do NOT need to restart Nginx! Nginx instantly serves whatever is inside the `dist/` folder. The moment the build finishes, your users will see the new frontend).*

---

## 🚀 The Automated Update Script (Recommended)

Typing all of those commands manually every time you update is tedious and prone to human error. Instead, create a script on your server that does it all automatically.

### 1. Create the Script File on the Server
Log into your server (`admin@47.117...`) and run:
```bash
nano /home/admin/update.sh
```

### 2. Paste this exact code:
```bash
#!/bin/bash
# automated update script for Art Therapy App

echo "======================================"
echo "🚀 Starting Deployment/Update..."
echo "======================================"

# 1. Pull Code
echo "📦 Pulling latest code from GitHub..."
cd /home/admin/art-therapy
git reset --hard HEAD
git pull origin main

# 2. Update Backend
echo "⚙️ Updating Backend..."
cd /home/admin/art-therapy/server
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
# Produces clean bundled output at dist/server.js
npm run build
pm2 restart art-therapy-api
echo "✅ Backend updated!"

# 3. Update Frontend
echo "🎨 Updating Frontend..."
cd /home/admin/art-therapy/client
npm ci
npm run build
echo "✅ Frontend updated!"

echo "======================================"
echo "🎉 Update Complete! Site is live."
echo "======================================"
```

### 3. Make the Script Executable
Save the file, exit `nano`, and then give the file permission to run:
```bash
chmod +x /home/admin/update.sh
```

### 4. How to use it in the future
Now, anytime you push code to GitHub and want it on your live server, you just SSH into your server and type exactly one command:
```bash
./update.sh
```

It will pull the code, handle the database migrations, rebuild the server, restart PM2, rebuild the frontend, and print out green success messages along the way!

---

## Release Migration Checklist (Bilingual + Follow/Chat + WebSocket)

Use this checklist when deploying the release that adds:

- `TherapyPlan.titleI18n/sloganI18n/introductionI18n`
- `Product.titleI18n/descriptionI18n`
- `UserFollow`, `Conversation`
- `Message.conversationId`, `MessageTrigger.CHAT`
- Socket.IO realtime chat delivery

### 1) Pre-deploy safety checks

```bash
cd ~/art-therapy
git pull origin main

# Optional but recommended backup
sudo -u postgres pg_dump arttherapy_db > ~/arttherapy_db_backup_$(date +%F_%H%M).sql
```

### 2) Backend dependency + Prisma migration order (important)

```bash
cd ~/art-therapy/server
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart art-therapy-api
```

Notes:

- Do not skip `prisma migrate deploy`.
- Do not restart API before migrations finish.
- Backend runtime artifact is `dist/server.js`; `dist/controllers` is not used.
- This release contains SQL backfill from legacy fields to i18n JSON fields.

### 3) Frontend deploy

```bash
cd ~/art-therapy/client
npm ci
npm run build
```

Nginx serves new `dist/` automatically.

### 4) Post-deploy verification (2-3 minutes)

```bash
# API health
curl http://127.0.0.1:3001/health

# Core endpoints
curl -I http://127.0.0.1:3001/api/v1/therapy-plans
curl -I http://127.0.0.1:3001/api/v1/products
```

Manual browser checks:

1. Open home page and confirm no `500` on `/therapy-plans` and `/products`.
2. Log in as MEMBER and verify `/api/v1/messages/unread-count` returns 200.
3. Follow a MEMBER from profile/product/plan owner area.
4. Start chat and verify:
   - first message succeeds
   - second consecutive message blocked (`409`)
   - after peer reply, send unlocked
5. Verify bilingual display fallback on a plan and a product in both `zh` and `en`.

### 5) Common failure and fix

If many endpoints return `500` and server logs show Prisma invocation errors:

- Cause: database schema not migrated to latest.
- Fix:

```bash
cd ~/art-therapy/server
npx prisma migrate deploy
npx prisma generate
pm2 restart art-therapy-api
```

If deploy fails with `P3018` and `ERROR: type "Role" already exists` on migration `20260303143933_unified_profile_system`:

- Cause: the database already contains legacy schema objects, but Prisma migration history was not baselined.
- Safe recovery (production):

```bash
cd ~/art-therapy/server

# 1) Confirm migration state
npx prisma migrate status

# 2) Mark the baseline migration as already applied
npx prisma migrate resolve --applied 20260303143933_unified_profile_system

# 3) Apply the remaining migrations
npx prisma migrate deploy
npx prisma generate
pm2 restart art-therapy-api
```

- Important: use `--applied` only when the target DB already has the baseline objects (User/UserProfile/TherapyPlan/Product tables and enums). If not, stop and take a DB backup before manual SQL repair.

If deploy/reset fails with `P3018`, migration `20260306020648_npm_run_db_generate`, and `ERROR: relation "MemberAddress" does not exist`:

- Cause: a legacy no-op migration tries to alter `MemberAddress` before the later migration that creates it.
- Safe recovery:

```bash
cd ~/art-therapy/server
npx prisma migrate resolve --applied 20260306020648_npm_run_db_generate
npx prisma migrate deploy
npx prisma generate
pm2 restart art-therapy-api
```

If Windows local dev shows Prisma engine rename `EPERM`, stop all Node processes and rerun `prisma generate`.

If browser console shows:

- `WebSocket connection ... /socket.io/... failed: WebSocket is closed before the connection is established`

Check:

1. Nginx includes `location /socket.io/` with websocket upgrade headers.
2. `sudo nginx -t` passes, then `sudo systemctl reload nginx`.
3. `pm2 restart art-therapy-api` after backend deploy.
4. `CLIENT_URL` in `server/.env` matches your actual frontend origin (including `https://` if SSL enabled).
