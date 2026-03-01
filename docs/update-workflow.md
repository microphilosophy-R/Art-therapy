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
