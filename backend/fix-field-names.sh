#!/bin/bash

# Исправление полей DTO и параметров

# client-relations
sed -i 's/relationType/relationType/g' src/client-relations/dto/create-relation.dto.ts
sed -i 's/relatedClientId/relatedClientId/g' src/client-relations/**/*.ts

# audit-log
sed -i 's/users:/user:/g' src/audit-log/**/*.ts
sed -i 's/created_at:/createdAt:/g' src/audit-log/**/*.ts
sed -i "s/'created_at'/'createdAt'/g" src/audit-log/**/*.ts
sed -i 's/user_id:/userId:/g' src/audit-log/**/*.ts

# attendances
sed -i 's/subscription_deducted/subscriptionDeducted/g' src/attendances/**/*.ts

# client-relations fields
sed -i 's/client_id:/clientId:/g' src/client-relations/**/*.ts
sed -i 's/related_client_id:/relatedClientId:/g' src/client-relations/**/*.ts
sed -i 's/first_name:/firstName:/g' src/client-relations/**/*.ts

# events
sed -i 's/event_type_id/eventTypeId/g' src/events/**/*.ts
sed -i 's/responsibleUser:/responsibleUser:/g' src/events/**/*.ts

echo "✅ Поля исправлены"
