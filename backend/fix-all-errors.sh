#!/bin/bash

echo "🔧 Комплексное исправление всех ошибок TypeScript..."

# 1. Исправление полей snake_case на camelCase в коде
find src -type f -name "*.ts" -exec sed -i \
  -e 's/schedule_id:/scheduleId:/g' \
  -e 's/client_id:/clientId:/g' \
  -e 's/user_id:/userId:/g' \
  -e 's/teacher_id:/teacherId:/g' \
  -e 's/studio_id:/studioId:/g' \
  -e 's/room_id:/roomId:/g' \
  -e 's/group_id:/groupId:/g' \
  -e 's/event_type_id:/eventTypeId:/g' \
  -e 's/related_client_id:/relatedClientId:/g' \
  -e 's/subscription_type_id:/subscriptionTypeId:/g' \
  -e 's/responsible_user_id:/responsibleUserId:/g' \
  -e 's/lead_source_id:/leadSourceId:/g' \
  -e 's/manager_id:/managerId:/g' \
  -e 's/parent_schedule_id:/parentScheduleId:/g' \
  -e 's/first_name:/firstName:/g' \
  -e 's/last_name:/lastName:/g' \
  -e 's/middle_name:/middleName:/g' \
  -e 's/date_of_birth:/dateOfBirth:/g' \
  -e 's/photo_url:/photoUrl:/g' \
  -e 's/created_at:/createdAt:/g' \
  -e 's/updated_at:/updatedAt:/g' \
  -e 's/start_time:/startTime:/g' \
  -e 's/end_time:/endTime:/g' \
  -e 's/is_active:/isActive:/g' \
  -e 's/is_recurring:/isRecurring:/g' \
  -e 's/last_login_at:/lastLoginAt:/g' \
  -e 's/subscription_deducted:/subscriptionDeducted:/g' \
  -e 's/max_participants:/maxParticipants:/g' \
  -e 's/single_session_price:/singleSessionPrice:/g' \
  -e 's/age_min:/ageMin:/g' \
  -e 's/age_max:/ageMax:/g' \
  -e 's/remaining_visits:/remainingVisits:/g' \
  -e 's/recurrence_rule:/recurrenceRule:/g' \
  -e 's/recurrence_end_date:/recurrenceEndDate:/g' \
  -e 's/cancellation_reason:/cancellationReason:/g' \
  -e 's/created_by:/createdBy:/g' \
  -e 's/total_price:/totalPrice:/g' \
  -e 's/client_name:/clientName:/g' \
  -e 's/client_phone:/clientPhone:/g' \
  -e 's/client_email:/clientEmail:/g' \
  -e 's/event_type:/eventType:/g' \
  -e 's/max_capacity:/maxCapacity:/g' \
  -e 's/relation_type:/relationType:/g' \
  {} +

# 2. Исправление plural includes на singular
find src -type f -name "*.ts" -exec sed -i \
  -e 's/users:/user:/g' \
  -e 's/clients:/client:/g' \
  -e 's/groups:/group:/g' \
  -e 's/teachers:/teacher:/g' \
  -e 's/studios:/studio:/g' \
  -e 's/rooms:/room:/g' \
  -e 's/schedules:/schedule:/g' \
  -e 's/attendances:/attendance:/g' \
  -e 's/events:/event:/g' \
  -e 's/lead_sources:/leadSource:/g' \
  -e 's/subscription_types:/subscriptionType:/g' \
  {} +

# 3. Исправление обращений к свойствам объектов
find src -type f -name "*.ts" -exec sed -i \
  -e "s/\\.schedule_id/.scheduleId/g" \
  -e "s/\\.client_id/.clientId/g" \
  -e "s/\\.user_id/.userId/g" \
  -e "s/\\.group_id/.groupId/g" \
  -e "s/\\.teacher_id/.teacherId/g" \
  -e "s/\\.studio_id/.studioId/g" \
  -e "s/\\.room_id/.roomId/g" \
  -e "s/\\.event_type_id/.eventTypeId/g" \
  -e "s/\\.related_client_id/.relatedClientId/g" \
  -e "s/\\.subscription_type_id/.subscriptionTypeId/g" \
  -e "s/\\.responsible_user_id/.responsibleUserId/g" \
  -e "s/\\.lead_source_id/.leadSourceId/g" \
  -e "s/\\.manager_id/.managerId/g" \
  -e "s/\\.first_name/.firstName/g" \
  -e "s/\\.last_name/.lastName/g" \
  -e "s/\\.middle_name/.middleName/g" \
  -e "s/\\.date_of_birth/.dateOfBirth/g" \
  -e "s/\\.photo_url/.photoUrl/g" \
  -e "s/\\.start_time/.startTime/g" \
  -e "s/\\.end_time/.endTime/g" \
  -e "s/\\.is_active/.isActive/g" \
  -e "s/\\.subscription_deducted/.subscriptionDeducted/g" \
  -e "s/\\.remaining_visits/.remainingVisits/g" \
  -e "s/\\.total_price/.totalPrice/g" \
  -e "s/\\.client_name/.clientName/g" \
  -e "s/\\.client_phone/.clientPhone/g" \
  -e "s/\\.client_email/.clientEmail/g" \
  -e "s/\\.event_type/.eventType/g" \
  -e "s/\\.event_types/.eventType/g" \
  -e "s/\\.max_capacity/.maxCapacity/g" \
  {} +

# 4. Исправление строковых ключей
find src -type f -name "*.ts" -exec sed -i \
  -e "s/'schedule_id'/'scheduleId'/g" \
  -e "s/'client_id'/'clientId'/g" \
  -e "s/'user_id'/'userId'/g" \
  -e "s/'group_id'/'groupId'/g" \
  -e "s/'created_at'/'createdAt'/g" \
  -e "s/'updated_at'/'updatedAt'/g" \
  -e "s/'start_time'/'startTime'/g" \
  -e "s/'end_time'/'endTime'/g" \
  -e "s/'first_name'/'firstName'/g" \
  -e "s/'last_name'/'lastName'/g" \
  -e "s/'middle_name'/'middleName'/g" \
  -e "s/'is_active'/'isActive'/g" \
  -e "s/'related_client_id'/'relatedClientId'/g" \
  -e "s/'lead_source_id'/'leadSourceId'/g" \
  -e "s/'last_login_at'/'lastLoginAt'/g" \
  {} +

# 5. Исправление DTO полей
find src -type f -name "*.dto.ts" -exec sed -i \
  -e 's/\s\+related_client_id:/ relatedClientId:/g' \
  -e 's/\s\+relation_type:/ relationType:/g' \
  -e 's/\s\+event_type_id:/ eventTypeId:/g' \
  -e 's/\s\+subscription_type_id:/ subscriptionTypeId:/g' \
  {} +

echo "✅ Все исправления применены!"
echo "📊 Проверяем количество ошибок..."
