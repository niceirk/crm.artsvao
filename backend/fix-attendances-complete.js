#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🚀 Полное исправление attendances.service.ts...\n');

const filePath = path.join(__dirname, 'src/attendances/attendances.service.ts');

// Читаем файл
let content = fs.readFileSync(filePath, 'utf8');

// Исправление 1: Убираем лишние скобки в findUnique where
content = content.replace(
  /where:\s*\{\s*clientId:\s*mark\.clientId,\s*\},\s*\},\s*\}\);/g,
  `where: {
            clientId_scheduleId: {
              clientId: mark.clientId,
              scheduleId: dto.scheduleId,
            },
          },
        });`
);

// Исправление 2: Добавляем scheduleId в create data
content = content.replace(
  /data:\s*\{\s*clientId:\s*mark\.clientId,\s*status:\s*mark\.status,\s*subscriptionDeducted:\s*shouldDeduct,\s*\},/g,
  `data: {
              scheduleId: dto.scheduleId,
              clientId: mark.clientId,
              status: mark.status,
              subscriptionDeducted: shouldDeduct,
            },`
);

// Записываем обратно
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Файл полностью исправлен!\n');
