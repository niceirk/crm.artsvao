#!/bin/bash

# Telegram Bot Webhook Setup Script
# This script configures the Telegram webhook for the bot

BOT_TOKEN="5193485073:AAHnsd-6Bc1FHYsw80QErZFcKYtE9_3RbO8"
WEBHOOK_URL="https://crm.artsvao.ru/api/telegram/webhook"

echo "Setting up Telegram webhook..."
echo "Bot Token: ${BOT_TOKEN:0:20}..."
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Set webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "Response from Telegram API:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Get webhook info to verify
echo "Verifying webhook configuration..."
INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
echo "$INFO" | python3 -m json.tool 2>/dev/null || echo "$INFO"
echo ""

# Check if webhook was set successfully
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Webhook configured successfully!"
else
  echo "❌ Failed to configure webhook. Please check the error above."
  exit 1
fi
