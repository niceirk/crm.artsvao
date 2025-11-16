const fs = require('fs');
const path = require('path');

// Исправления для DTO файлов - поля класса
const dtoFieldReplacements = [
  // ID fields
  { from: /(\s+)studioId(\s*[?:])/g, to: '$1studio_id$2' },
  { from: /(\s+)teacherId(\s*[?:])/g, to: '$1teacher_id$2' },
  { from: /(\s+)groupId(\s*[?:])/g, to: '$1group_id$2' },
  { from: /(\s+)clientId(\s*[?:])/g, to: '$1client_id$2' },
  { from: /(\s+)roomId(\s*[?:])/g, to: '$1room_id$2' },
  { from: /(\s+)userId(\s*[?:])/g, to: '$1user_id$2' },
  { from: /(\s+)scheduleId(\s*[?:])/g, to: '$1schedule_id$2' },
  { from: /(\s+)subscriptionId(\s*[?:])/g, to: '$1subscription_id$2' },
  { from: /(\s+)subscriptionTypeId(\s*[?:])/g, to: '$1subscription_type_id$2' },
  { from: /(\s+)leadSourceId(\s*[?:])/g, to: '$1lead_source_id$2' },
  { from: /(\s+)eventTypeId(\s*[?:])/g, to: '$1event_type_id$2' },
  { from: /(\s+)relatedClientId(\s*[?:])/g, to: '$1related_client_id$2' },
  { from: /(\s+)managerId(\s*[?:])/g, to: '$1manager_id$2' },
  { from: /(\s+)parentScheduleId(\s*[?:])/g, to: '$1parent_schedule_id$2' },

  // Name fields
  { from: /(\s+)firstName(\s*[?:])/g, to: '$1first_name$2' },
  { from: /(\s+)lastName(\s*[?:])/g, to: '$1last_name$2' },
  { from: /(\s+)middleName(\s*[?:])/g, to: '$1middle_name$2' },

  // Time/Date fields
  { from: /(\s+)startTime(\s*[?:])/g, to: '$1start_time$2' },
  { from: /(\s+)endTime(\s*[?:])/g, to: '$1end_time$2' },
  { from: /(\s+)startDate(\s*[?:])/g, to: '$1start_date$2' },
  { from: /(\s+)endDate(\s*[?:])/g, to: '$1end_date$2' },
  { from: /(\s+)dateOfBirth(\s*[?:])/g, to: '$1date_of_birth$2' },
  { from: /(\s+)createdAt(\s*[?:])/g, to: '$1created_at$2' },
  { from: /(\s+)updatedAt(\s*[?:])/g, to: '$1updated_at$2' },

  // Other fields
  { from: /(\s+)photoUrl(\s*[?:])/g, to: '$1photo_url$2' },
  { from: /(\s+)salaryPercentage(\s*[?:])/g, to: '$1salary_percentage$2' },
  { from: /(\s+)maxParticipants(\s*[?:])/g, to: '$1max_participants$2' },
  { from: /(\s+)singleSessionPrice(\s*[?:])/g, to: '$1single_session_price$2' },
  { from: /(\s+)isActive(\s*[?:])/g, to: '$1is_active$2' },
  { from: /(\s+)ageMin(\s*[?:])/g, to: '$1age_min$2' },
  { from: /(\s+)ageMax(\s*[?:])/g, to: '$1age_max$2' },
  { from: /(\s+)parentId(\s*[?:])/g, to: '$1parent_id$2' },
  { from: /(\s+)relationType(\s*[?:])/g, to: '$1relation_type$2' },
  { from: /(\s+)isEmergencyContact(\s*[?:])/g, to: '$1is_emergency_contact$2' },
  { from: /(\s+)canPickup(\s*[?:])/g, to: '$1can_pickup$2' },
  { from: /(\s+)eventType(\s*[?:])/g, to: '$1event_type$2' },
];

// Исправления для where условий в запросах
const whereFieldReplacements = [
  // В объектах where (с двоеточием)
  { from: /(\s+)studioId(\s*:)/g, to: '$1studio_id$2' },
  { from: /(\s+)teacherId(\s*:)/g, to: '$1teacher_id$2' },
  { from: /(\s+)groupId(\s*:)/g, to: '$1group_id$2' },
  { from: /(\s+)clientId(\s*:)/g, to: '$1client_id$2' },
  { from: /(\s+)roomId(\s*:)/g, to: '$1room_id$2' },
  { from: /(\s+)userId(\s*:)/g, to: '$1user_id$2' },
  { from: /(\s+)scheduleId(\s*:)/g, to: '$1schedule_id$2' },
  { from: /(\s+)subscriptionId(\s*:)/g, to: '$1subscription_id$2' },
  { from: /(\s+)subscriptionTypeId(\s*:)/g, to: '$1subscription_type_id$2' },
  { from: /(\s+)leadSourceId(\s*:)/g, to: '$1lead_source_id$2' },
  { from: /(\s+)eventTypeId(\s*:)/g, to: '$1event_type_id$2' },
  { from: /(\s+)relatedClientId(\s*:)/g, to: '$1related_client_id$2' },
  { from: /(\s+)managerId(\s*:)/g, to: '$1manager_id$2' },
  { from: /(\s+)parentScheduleId(\s*:)/g, to: '$1parent_schedule_id$2' },
  { from: /(\s+)createdBy(\s*:)/g, to: '$1created_by$2' },
  { from: /(\s+)updatedBy(\s*:)/g, to: '$1updated_by$2' },
];

// Исправления для include/select (отношения)
const relationReplacements = [
  { from: /(\s+)leadSource(\s*:)/g, to: '$1lead_sources$2' },
  { from: /(\s+)eventType(\s*:)/g, to: '$1event_types$2' },
  { from: /(\s+)subscriptionType(\s*:)/g, to: '$1subscription_types$2' },
];

function processDtoFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  dtoFieldReplacements.forEach(({ from, to }) => {
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

function processServiceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  whereFieldReplacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  relationReplacements.forEach(({ from, to }) => {
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

function walkDir(dir, filePattern, processor) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        updatedCount += walkDir(filePath, filePattern, processor);
      }
    } else if (filePattern.test(file)) {
      if (processor(filePath)) {
        console.log(`✓ Updated: ${filePath}`);
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

console.log('🔧 Starting DTO and service fixes...\n');

const srcDir = path.join(__dirname, 'src');

console.log('📝 Fixing DTO files...');
const dtoUpdated = walkDir(srcDir, /\.dto\.ts$/, processDtoFile);

console.log('\n🔧 Fixing service files...');
const serviceUpdated = walkDir(srcDir, /\.(service|controller)\.ts$/, processServiceFile);

console.log(`\n✅ Updated ${dtoUpdated} DTO files`);
console.log(`✅ Updated ${serviceUpdated} service/controller files`);
console.log('🎉 Done!');
