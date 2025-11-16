#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

let totalChanges = 0;
let filesModified = 0;

console.log('🚀 Исправление финальных 34 ошибок...\n');

// ============================================================================
// Категория 1: Исправление _count (убрать select, оставить просто true)
// ============================================================================
function fix_CountStructure() {
  console.log('📝 Исправление _count структуры');

  const files = [
    'src/rooms/rooms.service.ts',
    'src/studios/studios.service.ts',
    'src/event-types/event-types.service.ts',
  ];

  files.forEach(relativePath => {
    const filePath = path.join(__dirname, relativePath);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Заменяем _count: { select: { ... } } на _count: true
    const regex = /_count:\s*\{\s*select:\s*\{[^}]+\}\s*\}/g;
    const matches = content.match(regex);

    if (matches) {
      content = content.replace(regex, '_count: true');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   ✅ ${relativePath} - ${matches.length} изменений`);
      totalChanges += matches.length;
      filesModified++;
    }
  });
  console.log('');
}

// ============================================================================
// Категория 2: Исправление client-relations
// ============================================================================
function fixClientRelations() {
  console.log('📝 Исправление client-relations.service.ts');

  const filePath = path.join(__dirname, 'src/client-relations/client-relations.service.ts');
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanges = 0;

  // Заменяем related_client_id на relatedClientId
  const replacements = [
    { from: /const\s*\{\s*related_client_id,\s*relationType\s*\}/g, to: 'const { relatedClientId, relationType }' },
    { from: /related_client_id/g, to: 'relatedClientId' },
  ];

  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fileChanges += matches.length;
    }
  });

  if (fileChanges > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ client-relations.service.ts - ${fileChanges} изменений`);
    totalChanges += fileChanges;
    filesModified++;
  }
  console.log('');
}

// ============================================================================
// Категория 3: Исправление teachers.service.ts (salaryPercentage)
// ============================================================================
function fixTeachersSalary() {
  console.log('📝 Исправление teachers.service.ts salary');

  const filePath = path.join(__dirname, 'src/teachers/teachers.service.ts');
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Заменяем salaryPercentage на salary_percentage
  const regex = /createTeacherDto\.salaryPercentage/g;
  const matches = content.match(regex);

  if (matches) {
    content = content.replace(regex, 'createTeacherDto.salary_percentage');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ teachers.service.ts - ${matches.length} изменений`);
    totalChanges += matches.length;
    filesModified++;
  }
  console.log('');
}

// ============================================================================
// Категория 4: Исправление reservations.service.ts (rooms → room)
// ============================================================================
function fixReservations() {
  console.log('📝 Исправление reservations.service.ts');

  const filePath = path.join(__dirname, 'src/reservations/reservations.service.ts');
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Заменяем existing.rooms.id на existing.room.id
  const regex = /existing\.rooms\.id/g;
  const matches = content.match(regex);

  if (matches) {
    content = content.replace(regex, 'existing.room.id');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ reservations.service.ts - ${matches.length} изменений`);
    totalChanges += matches.length;
    filesModified++;
  }
  console.log('');
}

// ============================================================================
// Категория 5: Удаление несуществующих полей из recurring-schedule
// ============================================================================
function fixRecurringSchedule() {
  console.log('📝 Исправление recurring-schedule.service.ts');

  const filePath = path.join(__dirname, 'src/schedules/recurring-schedule.service.ts');
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanges = 0;

  // Удаляем recurrenceEndDate
  const regex1 = /recurrenceEndDate:\s*new\s*Date\(dto\.recurrenceRule\.endDate\),?\s*/g;
  if (content.match(regex1)) {
    content = content.replace(regex1, '');
    fileChanges++;
  }

  // Удаляем createdBy
  const regex2 = /createdBy,?\s*/g;
  if (content.match(regex2)) {
    content = content.replace(regex2, '');
    fileChanges++;
  }

  if (fileChanges > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ recurring-schedule.service.ts - ${fileChanges} изменений`);
    totalChanges += fileChanges;
    filesModified++;
  }
  console.log('');
}

// ============================================================================
// Главная функция
// ============================================================================
async function main() {
  try {
    fix_CountStructure();
    fixClientRelations();
    fixTeachersSalary();
    fixReservations();
    fixRecurringSchedule();

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
