#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let totalChanges = 0;
let filesModified = 0;

console.log('🚀 Исправление оставшихся ошибок (часть 2)...\n');

// ============================================================================
// Исправление _count в teachers.service.ts
// ============================================================================
function fixTeachersService() {
  console.log('📝 Исправление teachers.service.ts');

  const filePath = path.join(__dirname, 'src/teachers/teachers.service.ts');
  if (!fs.existsSync(filePath)) {
    console.log('   ⚠️  Файл не найден');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Исправляем структуру _count
  const oldPattern = /_count:\s*\{\s*select:\s*\{\s*group:\s*true,\s*schedule:\s*true,\s*_count:\s*\{\s*select:\s*\{\s*groups:\s*true\s*\}\s*\},\s*\}/g;
  const newPattern = `_count: {
          select: {
            groups: true,
            schedules: true,
          }`;

  if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('   ✅ Исправлена структура _count');
    totalChanges++;
    filesModified++;
  }

  console.log('');
}

// ============================================================================
// Исправление _count в других сервисах
// ============================================================================
function fixAllCountSelects() {
  console.log('📝 Исправление _count.select во всех сервисах');

  const fixes = [
    {
      file: 'src/teachers/teachers.service.ts',
      replacements: [
        { from: /group:\s*true/g, to: 'groups: true' },
        { from: /schedule:\s*true/g, to: 'schedules: true' },
      ]
    },
    {
      file: 'src/event-types/event-types.service.ts',
      replacements: [
        { from: /event:\s*true/g, to: 'events: true' },
      ]
    },
    {
      file: 'src/lead-sources/lead-sources.service.ts',
      replacements: [
        { from: /client:\s*true/g, to: 'clients: true' },
      ]
    },
    {
      file: 'src/rooms/rooms.service.ts',
      replacements: [
        { from: /schedule:\s*true/g, to: 'schedules: true' },
      ]
    },
    {
      file: 'src/studios/studios.service.ts',
      replacements: [
        { from: /group:\s*true/g, to: 'groups: true' },
        { from: /schedule:\s*true/g, to: 'schedules: true' },
      ]
    },
  ];

  fixes.forEach(({ file: relativePath, replacements }) => {
    const filePath = path.join(__dirname, relativePath);
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Файл не найден: ${relativePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    let fileChanges = 0;

    replacements.forEach(({ from, to }) => {
      const matches = content.match(from);
      if (matches) {
        content = content.replace(from, to);
        fileChanges += matches.length;
        changed = true;
      }
    });

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ ${relativePath} - ${fileChanges} изменений`);
      totalChanges += fileChanges;
      filesModified++;
    }
  });

  console.log('');
}

// ============================================================================
// Исправление prisma.reservations → prisma.reservation
// ============================================================================
function fixReservationReferences() {
  console.log('📝 Исправление prisma.reservations → prisma.reservation');

  const files = [
    'src/reservations/reservations.service.ts',
    'src/shared/conflict-checker.service.ts',
  ];

  files.forEach(relativePath => {
    const filePath = path.join(__dirname, relativePath);
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Файл не найден: ${relativePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /this\.prisma\.reservations\b/g;
    const matches = content.match(regex);

    if (matches) {
      content = content.replace(regex, 'this.prisma.reservation');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ ${relativePath} - ${matches.length} изменений`);
      totalChanges += matches.length;
      filesModified++;
    }
  });

  console.log('');
}

// ============================================================================
// Исправление valid_month → validMonth в Subscription
// ============================================================================
function fixValidMonth() {
  console.log('📝 Исправление valid_month → validMonth в Subscription');

  const files = [
    'src/schedules/schedules.service.ts',
    'src/schedules/bulk-schedule.service.ts',
    'src/schedules/recurring-schedule.service.ts',
  ];

  files.forEach(relativePath => {
    const filePath = path.join(__dirname, relativePath);
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  Файл не найден: ${relativePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const regex = /valid_month:/g;
    const matches = content.match(regex);

    if (matches) {
      content = content.replace(regex, 'validMonth:');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ ${relativePath} - ${matches.length} изменений`);
      totalChanges += matches.length;
      filesModified++;
    }
  });

  console.log('');
}

// ============================================================================
// Исправление отсутствия salaryPercentage в CreateTeacherDto
// ============================================================================
function fixTeacherDto() {
  console.log('📝 Исправление CreateTeacherDto - добавление salaryPercentage');

  const dtoPath = path.join(__dirname, 'src/teachers/dto/create-teacher.dto.ts');
  const servicePath = path.join(__dirname, 'src/teachers/teachers.service.ts');

  if (!fs.existsSync(servicePath)) {
    console.log('   ⚠️  Файл service не найден');
    return;
  }

  // В service файле нужно убрать прямое использование DTO и добавить салари
  let content = fs.readFileSync(servicePath, 'utf8');

  // Найти и заменить простое использование createTeacherDto на spread с salaryPercentage
  const createPattern = /data:\s*createTeacherDto,/;
  if (content.match(createPattern)) {
    const replacement = `data: {
        ...createTeacherDto,
        salaryPercentage: createTeacherDto.salaryPercentage || 0,
      },`;
    content = content.replace(createPattern, replacement);
    fs.writeFileSync(servicePath, content, 'utf8');
    console.log('   ✅ teachers.service.ts - добавлен salaryPercentage с default значением');
    totalChanges++;
    filesModified++;
  }

  console.log('');
}

// ============================================================================
// Главная функция
// ============================================================================
async function main() {
  try {
    fixTeachersService();
    fixAllCountSelects();
    fixReservationReferences();
    fixValidMonth();
    fixTeacherDto();

    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Исправление завершено!`);
    console.log(`📊 Всего изменений: ${totalChanges}`);
    console.log(`📁 Файлов изменено: ${filesModified}`);
    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Ошибка при исправлении:', error);
    process.exit(1);
  }
}

main();
