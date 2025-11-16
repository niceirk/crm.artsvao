const fs = require('fs');
const path = require('path');

// 1. Исправления для параметров функций - оставляем camelCase
const queryParamsFixes = [
  // Замена обращений к query параметрам: queryParams.room_id -> queryParams.roomId
  { from: /queryParams\.room_id\b/g, to: 'queryParams.roomId' },
  { from: /queryParams\.teacher_id\b/g, to: 'queryParams.teacherId' },
  { from: /queryParams\.group_id\b/g, to: 'queryParams.groupId' },
  { from: /queryParams\.client_id\b/g, to: 'queryParams.clientId' },
  { from: /queryParams\.studio_id\b/g, to: 'queryParams.studioId' },
  { from: /queryParams\.event_type_id\b/g, to: 'queryParams.eventTypeId' },
];

// 2. Исправления для include/select - отношения должны быть во множественном числе
const includeSelectFixes = [
  { from: /(\s+)client(\s*:)/g, to: '$1clients$2' },
  { from: /(\s+)teacher(\s*:)/g, to: '$1teachers$2' },
  { from: /(\s+)room(\s*:)/g, to: '$1rooms$2' },
  { from: /(\s+)group(\s*:)/g, to: '$1groups$2' },
  { from: /(\s+)studio(\s*:)/g, to: '$1studios$2' },
  { from: /(\s+)subscription(\s*:)/g, to: '$1subscriptions$2' },
  { from: /(\s+)schedule(\s*:)/g, to: '$1schedules$2' },
];

// 3. Исправления для названий моделей Prisma
const modelNameFixes = [
  { from: /prisma\.attendance\./g, to: 'prisma.attendances.' },
];

// 4. Исправления для ConflictCheckParams интерфейса
const interfaceFixes = [
  // teacher_id: -> teacherId: в параметрах ConflictCheckParams
  { from: /(\s+)teacher_id(\s*:.*ConflictCheckParams)/g, to: '$1teacherId$2' },
];

// 5. Исправления для shorthand properties в контроллерах
// Когда используются { date, room_id, teacher_id } нужно заменить на roomId, teacherId
const shorthandPropertyFixes = [
  // В вызовах функций с shorthand: { date, room_id, ... } -> { date, roomId: room_id, ... }
  { from: /\{\s*date,\s*room_id,\s*teacher_id,\s*groupId\s*\}/g, to: '{ date, roomId: room_id, teacherId: teacher_id, groupId }' },
  { from: /\{\s*date,\s*room_id,\s*teacherId,\s*groupId\s*\}/g, to: '{ date, roomId: room_id, teacherId, groupId }' },
  { from: /\{\s*date,\s*roomId,\s*teacher_id,\s*groupId\s*\}/g, to: '{ date, roomId, teacherId: teacher_id, groupId }' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply all fixes
  const allFixes = [
    ...queryParamsFixes,
    ...includeSelectFixes,
    ...modelNameFixes,
    ...interfaceFixes,
    ...shorthandPropertyFixes,
  ];

  allFixes.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir, filePattern) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        updatedCount += walkDir(filePath, filePattern);
      }
    } else if (filePattern.test(file)) {
      if (processFile(filePath)) {
        console.log(`✓ Updated: ${filePath}`);
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

console.log('🔧 Fixing remaining errors...\n');

const srcDir = path.join(__dirname, 'src');
const updatedFiles = walkDir(srcDir, /\.(ts)$/);

console.log(`\n✅ Updated ${updatedFiles} files`);
console.log('🎉 Done!');
