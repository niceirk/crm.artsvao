#!/bin/sh
set -e

echo "=================================="
echo "🚀 Starting ARTSVAO Backend"
echo "=================================="

echo ""
echo "📊 Checking database connection..."
# Wait for database to be ready
until npx prisma db execute --stdin <<< 'SELECT 1' > /dev/null 2>&1; do
  echo "⏳ Waiting for database to be ready..."
  sleep 2
done
echo "✅ Database is ready!"

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
