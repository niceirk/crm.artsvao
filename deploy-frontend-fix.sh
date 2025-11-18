#!/bin/bash

# Deployment script for frontend fix
set -e

echo "🚀 Deploying frontend fix to production server..."

# Server configuration
SERVER="root@109.196.102.90"
PASSWORD="gw7QDuYY#6Vwsc"
DEPLOY_PATH="/root"

# Copy updated files to server
echo "📦 Copying updated files to server..."
sshpass -p "$PASSWORD" rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude '.git' \
  ./frontend/Dockerfile \
  ./docker-compose.prod.yml \
  ./.env.production \
  $SERVER:$DEPLOY_PATH/

# Rebuild and restart frontend container
echo "🔨 Rebuilding frontend container with correct build args..."
sshpass -p "$PASSWORD" ssh $SERVER "cd $DEPLOY_PATH && \
  docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend && \
  docker-compose -f docker-compose.prod.yml --env-file .env.production up -d frontend"

echo "✅ Frontend deployment complete!"
echo "🌐 Check https://crm.artsvao.ru/login"
