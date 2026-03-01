#!/bin/bash

# Automated deployment and update script for Art Therapy App (Aliyun)
# Ensure this file is run on the server, not locally!
# Give it execute permissions on your server: chmod +x update.sh

# Abort script on any error
set -e

echo "======================================"
echo "🚀 Starting Art Therapy Update Sequence..."
echo "======================================"

# 1. Check if we are in the correct directory (Assumes /home/admin/art-therapy)
APP_DIR="/home/admin/art-therapy"

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Error: Application directory $APP_DIR not found."
    echo "Please update the APP_DIR variable in this script."
    exit 1
fi

cd "$APP_DIR" || exit

# 2. Pull Code from GitHub
echo "📦 Pulling latest code from main branch..."
# Resets any local server modifications and pulls fresh code
git reset --hard HEAD
git pull origin main

# 3. Update Backend API & Database
echo "⚙️  Updating Backend components..."
cd "$APP_DIR/server" || exit

echo "   -> Installing Node dependencies (Production)..."
npm ci --omit=dev

echo "   -> Generating Prisma Client..."
npx prisma generate

echo "   -> Running Database Migrations..."
npx prisma migrate deploy

echo "   -> Building TypeScript API..."
npm run build

echo "   -> Restarting PM2 process (art-therapy-api)..."
pm2 restart art-therapy-api
echo "✅ Backend successfully updated and restarted."

# 4. Update Frontend React Client
echo "🎨 Updating Frontend React Client..."
cd "$APP_DIR/client" || exit

echo "   -> Installing Node dependencies..."
npm ci

echo "   -> Building Static React Site..."
npm run build
echo "✅ Frontend successfully built. Nginx will serve the new files automatically."

echo "======================================"
echo "🎉 Update Complete! The new code is now LIVE."
echo "======================================"
