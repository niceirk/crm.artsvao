#!/bin/sh
set -e

echo "=================================="
echo "🚀 Starting ARTSVAO Backend"
echo "=================================="

echo ""
echo "📊 Waiting for database..."
# Simple wait for database
sleep 5
echo "✅ Database should be ready!"

echo ""
echo "🔄 Running database migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ ERROR: Migration failed!"
  echo ""
  echo "📋 Migration status:"
  npx prisma migrate status || true
  echo ""
  echo "🛑 Exiting due to migration failure"
  exit 1
fi

echo ""
echo "🎯 Starting application..."
exec node dist/src/main
