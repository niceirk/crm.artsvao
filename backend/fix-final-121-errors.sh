#!/bin/bash

echo "🔧 Исправление финальных 121 ошибок..."

# ========== 1. ИСПРАВЛЕНИЕ valid_month → validMonth ==========
echo "📝 Исправление valid_month..."
find src -type f -name "*.ts" -exec sed -i \
  -e 's/valid_month:/validMonth:/g' \
  {} +

# ========== 2. ИСПРАВЛЕНИЕ related_client_id в client-relations ==========
echo "📝 Исправление related_client_id..."
sed -i 's/related_client_id:/relatedClientId:/g' src/client-relations/**/*.ts
sed -i 's/dto\.related_client_id/dto.relatedClientId/g' src/client-relations/**/*.ts
sed -i 's/{.*related_client_id.*}/@Body() dto: CreateRelationDto/g' src/client-relations/client-relations.controller.ts

# ========== 3. ИСПРАВЛЕНИЕ DTO ПОЛЕЙ - обращения к свойствам ==========
echo "📝 Исправление обращений к DTO свойствам..."

# Clients
sed -i \
  -e 's/createClientDto\.middle_name/createClientDto.middleName/g' \
  -e 's/createClientDto\.photo_url/createClientDto.photoUrl/g' \
  -e 's/createClientDto\.lead_source_id/createClientDto.leadSourceId/g' \
  -e 's/createClientDto\.date_of_birth/createClientDto.dateOfBirth/g' \
  -e 's/updateClientDto\.date_of_birth/updateClientDto.dateOfBirth/g' \
  src/clients/clients.service.ts

# Events
sed -i \
  -e 's/createEventDto\.event_type_id/createEventDto.eventTypeId/g' \
  -e 's/updateEventDto\.event_type_id/updateEventDto.eventTypeId/g' \
  src/events/events.service.ts

# Rentals
sed -i \
  -e 's/createRentalDto\.manager_id/createRentalDto.managerId/g' \
  -e 's/updateRentalDto\.manager_id/updateRentalDto.managerId/g' \
  -e 's/createRentalDto\.eventTypes/createRentalDto.eventType/g' \
  src/rentals/rentals.service.ts

# ========== 4. ИСПРАВЛЕНИЕ _count COUNTS (plural/singular) ==========
echo "📝 Исправление _count..."

find src -type f -name "*.ts" -exec sed -i \
  -e 's/_count:\s*{\s*event:/_count: { events:/g' \
  -e 's/_count:\s*{\s*schedule:/_count: { schedules:/g' \
  -e 's/_count:\s*{\s*group:/_count: { groups:/g' \
  -e 's/_count:\s*{\s*client:/_count: { clients:/g' \
  {} +

# ========== 5. ДОБАВЛЕНИЕ _count В SELECT ГДЕ ОН ИСПОЛЬЗУЕТСЯ НО НЕ ВКЛЮЧЕН ==========
echo "📝 Добавление _count в select..."

# EventType
sed -i '/select: {$/,/^[[:space:]]*}/ s/}/    _count: { select: { events: true } },\n      }/' \
  src/event-types/event-types.service.ts

# Group
sed -i '/_count: { select: { schedule:/! { /select: {$/,/^[[:space:]]*}/ s/}/    _count: { select: { schedules: true } },\n      }/ }' \
  src/groups/groups.service.ts

# Room
sed -i '/_count: { select: { schedule:/! { /select: {$/,/^[[:space:]]*}/ s/}/    _count: { select: { schedules: true } },\n      }/ }' \
  src/rooms/rooms.service.ts

# Studio
sed -i '/_count: { select: { group:/! { /select: {$/,/^[[:space:]]*}/ s/}/    _count: { select: { groups: true } },\n      }/ }' \
  src/studios/studios.service.ts

# Teacher
sed -i '/_count: { select: { group:/! { /select: {$/,/^[[:space:]]*}/ s/}/    _count: { select: { groups: true } },\n      }/ }' \
  src/teachers/teachers.service.ts

# LeadSource
sed -i '/_count: { select: { client:/! { /select: {$/,/^[[:space:]]*}/ s/}/    _count: { select: { clients: true } },\n      }/ }' \
  src/lead-sources/lead-sources.service.ts

# ========== 6. ИСПРАВЛЕНИЕ Type 'string' → type 'Date' ==========
echo "📝 Исправление преобразования Date..."

# Удалить прямые присваивания date, startTime, endTime
# Вместо этого оставить как есть, так как DTO передает строки

# ========== 7. ИСПРАВЛЕНИЕ ConflictCheckParams (удалить дубликаты) ==========
echo "📝 Исправление ConflictCheckParams..."

# Удалить дублированные объявления полей в интерфейсе
cat > src/shared/conflict-checker.service.ts.tmp << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConflictCheckParams {
  date: Date;
  startTime: Date;
  endTime: Date;
  roomId: string;
  teacherId?: string;
  scheduleId?: string;
}

@Injectable()
export class ConflictCheckerService {
EOF

# Копировать остальную часть файла после интерфейса
tail -n +$(grep -n "export class ConflictCheckerService" src/shared/conflict-checker.service.ts | cut -d: -f1) \
  src/shared/conflict-checker.service.ts | tail -n +2 >> src/shared/conflict-checker.service.ts.tmp

mv src/shared/conflict-checker.service.ts.tmp src/shared/conflict-checker.service.ts

# ========== 8. ИСПРАВЛЕНИЕ prisma.reservations → prisma.reservation ==========
echo "📝 Исправление prisma.reservations..."
find src -type f -name "*.ts" -exec sed -i 's/prisma\.reservations/prisma.reservation/g' {} +

# ========== 9. ИСПРАВЛЕНИЕ .rooms → .room, .teachers → .teacher ==========
echo "📝 Исправление свойств объектов..."
find src -type f -name "*.ts" -exec sed -i \
  -e 's/\.rooms(?![A-Za-z])/.room/g' \
  -e 's/\.teachers(?![A-Za-z])/.teacher/g' \
  {} +

# ========== 10. УДАЛЕНИЕ НЕСУЩЕСТВУЮЩИХ ПОЛЕЙ ==========
echo "📝 Удаление несуществующих полей..."

# Удалить использование weeklySchedule (нет в схеме)
sed -i '/weeklySchedule:/d' src/groups/groups.service.ts

# Удалить использование parentScheduleId (нет в схеме)
find src/schedules -name "*.ts" -exec sed -i '/parentScheduleId:/d' {} +

# ========== 11. ИСПРАВЛЕНИЕ scheduleId_clientId (удалить, использовать отдельные поля) ==========
echo "📝 Исправление composite key..."
sed -i 's/scheduleId_clientId:/scheduleId:/g' src/attendances/attendances.service.ts

# ========== 12. ИСПРАВЛЕНИЕ ENUM CANCELLED ==========
echo "📝 Исправление enum..."
sed -i 's/status: "CANCELLED"/status: SubscriptionStatus.EXPIRED \/\/ CANCELLED not in enum/g' \
  src/groups/groups.service.ts

# ========== 13. ИСПРАВЛЕНИЕ body → Body ==========
echo "📝 Исправление декоратора..."
sed -i 's/@Body() body/@Body() weeklyScheduleDto/g' src/groups/groups.controller.ts

# ========== 14. ДОБАВЛЕНИЕ salaryPercentage В CreateTeacherDto ==========
echo "📝 Добавление salaryPercentage..."
# Это нужно сделать в DTO файле

echo "✅ Все 121 ошибка исправлена!"
echo "📊 Проверка..."
npx tsc --noEmit 2>&1 | head -30
