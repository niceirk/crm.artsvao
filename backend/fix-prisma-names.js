const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Массив замен для моделей Prisma
const modelReplacements = [
  { from: /prisma\.rental\./g, to: 'prisma.rentals.' },
  { from: /prisma\.event\./g, to: 'prisma.events.' },
  { from: /prisma\.reservation\./g, to: 'prisma.reservations.' },
  { from: /prisma\.room\./g, to: 'prisma.rooms.' },
  { from: /prisma\.client\./g, to: 'prisma.clients.' },
  { from: /prisma\.user\./g, to: 'prisma.users.' },
];

// Массив замен для полей (camelCase -> snake_case)
const fieldReplacements = [
  // General ID fields
  { from: /(\s+)studioId(\s*[,:\)])/g, to: '$1studio_id$2' },
  { from: /(\s+)teacherId(\s*[,:\)])/g, to: '$1teacher_id$2' },
  { from: /(\s+)groupId(\s*[,:\)])/g, to: '$1group_id$2' },
  { from: /(\s+)clientId(\s*[,:\)])/g, to: '$1client_id$2' },
  { from: /(\s+)roomId(\s*[,:\)])/g, to: '$1room_id$2' },
  { from: /(\s+)userId(\s*[,:\)])/g, to: '$1user_id$2' },
  { from: /(\s+)scheduleId(\s*[,:\)])/g, to: '$1schedule_id$2' },
  { from: /(\s+)subscriptionId(\s*[,:\)])/g, to: '$1subscription_id$2' },
  { from: /(\s+)subscriptionTypeId(\s*[,:\)])/g, to: '$1subscription_type_id$2' },

  // Specific fields
  { from: /(\s+)firstName(\s*[,:\)])/g, to: '$1first_name$2' },
  { from: /(\s+)lastName(\s*[,:\)])/g, to: '$1last_name$2' },
  { from: /(\s+)middleName(\s*[,:\)])/g, to: '$1middle_name$2' },
  { from: /(\s+)photoUrl(\s*[,:\)])/g, to: '$1photo_url$2' },
  { from: /(\s+)salaryPercentage(\s*[,:\)])/g, to: '$1salary_percentage$2' },
  { from: /(\s+)createdAt(\s*[,:\)])/g, to: '$1created_at$2' },
  { from: /(\s+)updatedAt(\s*[,:\)])/g, to: '$1updated_at$2' },
  { from: /(\s+)startTime(\s*[,:\)])/g, to: '$1start_time$2' },
  { from: /(\s+)endTime(\s*[,:\)])/g, to: '$1end_time$2' },
  { from: /(\s+)startDate(\s*[,:\)])/g, to: '$1start_date$2' },
  { from: /(\s+)endDate(\s*[,:\)])/g, to: '$1end_date$2' },
  { from: /(\s+)dateOfBirth(\s*[,:\)])/g, to: '$1date_of_birth$2' },
  { from: /(\s+)maxParticipants(\s*[,:\)])/g, to: '$1max_participants$2' },
  { from: /(\s+)singleSessionPrice(\s*[,:\)])/g, to: '$1single_session_price$2' },
  { from: /(\s+)leadSourceId(\s*[,:\)])/g, to: '$1lead_source_id$2' },
  { from: /(\s+)relatedClientId(\s*[,:\)])/g, to: '$1related_client_id$2' },
  { from: /(\s+)isActive(\s*[,:\)])/g, to: '$1is_active$2' },
  { from: /(\s+)ageMin(\s*[,:\)])/g, to: '$1age_min$2' },
  { from: /(\s+)ageMax(\s*[,:\)])/g, to: '$1age_max$2' },
];

// Массив замен для отношений в include/select
const relationReplacements = [
  { from: /(\s+)teacher(\s*:\s*\{)/g, to: '$1teachers$2' },
  { from: /(\s+)room(\s*:\s*\{)/g, to: '$1rooms$2' },
  { from: /(\s+)group(\s*:\s*\{)/g, to: '$1groups$2' },
  { from: /(\s+)client(\s*:\s*\{)/g, to: '$1clients$2' },
  { from: /(\s+)studio(\s*:\s*\{)/g, to: '$1studios$2' },
  { from: /(\s+)schedule(\s*:\s*\{)/g, to: '$1schedules$2' },
  { from: /(\s+)subscription(\s*:\s*\{)/g, to: '$1subscriptions$2' },
  { from: /(\s+)user(\s*:\s*\{)/g, to: '$1users$2' },
  { from: /(\s+)leadSource(\s*:\s*\{)/g, to: '$1lead_sources$2' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply model replacements
  modelReplacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  // Apply field replacements
  fieldReplacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  // Apply relation replacements
  relationReplacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated: ${filePath}`);
    return true;
  }

  return false;
}

function walkDir(dir, filePattern = /\.(ts|js)$/) {
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
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

console.log('🔧 Starting Prisma naming fixes...\n');

const srcDir = path.join(__dirname, 'src');
const updatedFiles = walkDir(srcDir);

console.log(`\n✅ Updated ${updatedFiles} files`);
console.log('🎉 Done!');
