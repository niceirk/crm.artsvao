const fs = require('fs');
const path = require('path');

// Финальные исправления
const finalFixes = [
  // Доступ к полям объектов - subscriptions
  { from: /(\w+)\.subscriptionDeducted\b/g, to: '$1.subscription_deducted' },
  { from: /(\w+)\.validMonth\b/g, to: '$1.valid_month' },
  { from: /(\w+)\.remainingVisits\b/g, to: '$1.remaining_visits' },
  { from: /(\w+)\.sessionsCount\b/g, to: '$1.sessions_count' },
  { from: /(\w+)\.isRecurring\b/g, to: '$1.is_recurring' },
  { from: /(\w+)\.recurrenceRule\b/g, to: '$1.recurrence_rule' },
  { from: /(\w+)\.parentScheduleId\b/g, to: '$1.parent_schedule_id' },

  // Поля в where/update объектах
  { from: /(\s+)validMonth(\s*:)/g, to: '$1valid_month$2' },
  { from: /(\s+)remainingVisits(\s*:)/g, to: '$1remaining_visits$2' },
  { from: /(\s+)subscriptionDeducted(\s*:)/g, to: '$1subscription_deducted$2' },
  { from: /(\s+)sessionsCount(\s*:)/g, to: '$1sessions_count$2' },
  { from: /(\s+)isRecurring(\s*:)/g, to: '$1is_recurring$2' },
  { from: /(\s+)recurrenceRule(\s*:)/g, to: '$1recurrence_rule$2' },
  { from: /(\s+)parentScheduleId(\s*:)/g, to: '$1parent_schedule_id$2' },

  // Отношения: existing.room -> existing.rooms
  { from: /existing\.room\b/g, to: 'existing.rooms' },
  { from: /existing\.teacher\b/g, to: 'existing.teachers' },
  { from: /existing\.client\b/g, to: 'existing.clients' },
  { from: /existing\.group\b/g, to: 'existing.groups' },
  { from: /existing\.studio\b/g, to: 'existing.studios' },

  // schedule.room -> schedule.rooms
  { from: /schedule\.room\b/g, to: 'schedule.rooms' },
  { from: /schedule\.teacher\b/g, to: 'schedule.teachers' },
  { from: /schedule\.client\b/g, to: 'schedule.clients' },
  { from: /subscription\.client\b/g, to: 'subscription.clients' },
  { from: /attendance\.client\b/g, to: 'attendance.clients' },
  { from: /attendance\.schedule\b/g, to: 'attendance.schedules' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  finalFixes.forEach(({ from, to }) => {
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

console.log('🔧 Final batch of fixes...\n');

const srcDir = path.join(__dirname, 'src');
const updatedFiles = walkDir(srcDir, /\.(ts)$/);

console.log(`\n✅ Updated ${updatedFiles} files`);
console.log('🎉 Done!');
