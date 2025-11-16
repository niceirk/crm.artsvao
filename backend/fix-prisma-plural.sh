#!/bin/bash

# Скрипт для замены plural имён Prisma моделей на singular

find src -type f \( -name "*.ts" -o -name "*.service.ts" -o -name "*.controller.ts" \) -exec sed -i \
  -e 's/prisma\.users/prisma.user/g' \
  -e 's/prisma\.clients/prisma.client/g' \
  -e 's/prisma\.groups/prisma.group/g' \
  -e 's/prisma\.teachers/prisma.teacher/g' \
  -e 's/prisma\.studios/prisma.studio/g' \
  -e 's/prisma\.rooms/prisma.room/g' \
  -e 's/prisma\.schedules/prisma.schedule/g' \
  -e 's/prisma\.attendances/prisma.attendance/g' \
  -e 's/prisma\.events/prisma.event/g' \
  -e 's/prisma\.event_types/prisma.eventType/g' \
  -e 's/prisma\.subscriptions/prisma.subscription/g' \
  -e 's/prisma\.subscription_types/prisma.subscriptionType/g' \
  -e 's/prisma\.payments/prisma.payment/g' \
  -e 's/prisma\.rentals/prisma.rental/g' \
  -e 's/prisma\.lead_sources/prisma.leadSource/g' \
  -e 's/prisma\.audit_logs/prisma.auditLog/g' \
  -e 's/prisma\.client_relations/prisma.clientRelation/g' \
  {} +

echo "✅ Замены выполнены"
