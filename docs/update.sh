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
timeout 60 git pull origin main || { echo "❌ Git pull timed out or failed"; exit 1; }

# 3. Update Backend API & Database
echo "⚙️  Updating Backend components..."
cd "$APP_DIR/server" || exit

echo "   -> Installing Node dependencies (Production)..."
npm ci --omit=dev --prefer-offline --no-audit

echo "   -> Generating Prisma Client..."
npx prisma generate

echo "   -> Running Database Migrations..."
MIGRATE_LOG="$(mktemp)"
MIGRATE_RECOVERED=0
if ! npx prisma migrate deploy 2>&1 | tee "$MIGRATE_LOG"; then
    if grep -q 'Error: P3018' "$MIGRATE_LOG" && grep -q 'type "Role" already exists' "$MIGRATE_LOG"; then
        echo ""
        echo "Migration baseline conflict detected (P3018: type \"Role\" already exists)."
        echo "This usually means the database already has legacy/app tables but Prisma migration history is missing."
        echo "Run these commands manually in $APP_DIR/server, then run this script again:"
        echo "  npx prisma migrate resolve --applied 20260303143933_unified_profile_system"
        echo "  npx prisma migrate deploy"
        echo ""
    elif grep -q 'Error: P3018' "$MIGRATE_LOG" \
      && grep -q 'Migration name: 20260306020648_npm_run_db_generate' "$MIGRATE_LOG" \
      && grep -q 'relation "MemberAddress" does not exist' "$MIGRATE_LOG"; then
        echo ""
        echo "Known legacy migration ordering issue detected (20260306020648_npm_run_db_generate)."
        echo "Applying safe recovery automatically: mark this migration as applied, then continue deploy..."
        npx prisma migrate resolve --applied 20260306020648_npm_run_db_generate
        npx prisma migrate deploy
        MIGRATE_RECOVERED=1
        echo ""
    fi
    rm -f "$MIGRATE_LOG"
    if [ "$MIGRATE_RECOVERED" -eq 0 ]; then
        exit 1
    fi
fi
rm -f "$MIGRATE_LOG"

echo "   -> Building TypeScript API..."
npm run build

echo "   -> Restarting PM2 process (art-therapy-api)..."
pm2 restart art-therapy-api
echo "✅ Backend successfully updated and restarted."

# 4. Update Frontend React Client
echo "🎨 Updating Frontend React Client..."
cd "$APP_DIR/client" || exit

echo "   -> Installing Node dependencies..."
npm ci --prefer-offline --no-audit

echo "   -> Building Static React Site..."
npm run build
echo "✅ Frontend successfully built. Nginx will serve the new files automatically."

echo "======================================"
echo "🎉 Update Complete! The new code is now LIVE."
echo "======================================"
