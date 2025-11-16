#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🚀 Исправление attendances.service.ts...\n');

const filePath = path.join(__dirname, 'src/attendances/attendances.service.ts');

// Читаем файл
let content = fs.readFileSync(filePath, 'utf8');

// Исправляем сломанные места
const fixes = [
  {
    from: /where:\s*\{\s*clientId:\s*dto\.clientId,\s*\},\s*\},\s*\}\);/g,
    to: `where: {
        clientId_scheduleId: {
          clientId: dto.clientId,
          scheduleId: dto.scheduleId,
        },
      },
    });`
  },
  {
    from: /async findBySchedule\(\},/g,
    to: 'async findBySchedule(scheduleId: string) {\n    const schedule = await this.prisma.schedule.findUnique({\n      where: { id: scheduleId },'
  },
  {
    from: /data:\s*\{\s*clientId:\s*dto\.clientId,/g,
    to: `data: {
        scheduleId: dto.scheduleId,
        clientId: dto.clientId,`
  }
];

let totalChanges = 0;

fixes.forEach(({ from, to }, index) => {
  const matches = content.match(from);
  if (matches) {
    content = content.replace(from, to);
    console.log(`   ✅ Исправление ${index + 1} - ${matches.length} изменений`);
    totalChanges += matches.length;
  }
});

// Записываем обратно
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Файл исправлен! Всего ${totalChanges} изменений`);
