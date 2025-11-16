const fs = require('fs');
const path = require('path');

// Замены для доступа к полям объектов (например, schedule.startTime -> schedule.start_time)
const objectFieldReplacements = [
  // Time fields
  { from: /(\w+)\.startTime\b/g, to: '$1.start_time' },
  { from: /(\w+)\.endTime\b/g, to: '$1.end_time' },
  { from: /(\w+)\.start_Date\b/g, to: '$1.start_date' },
  { from: /(\w+)\.endDate\b/g, to: '$1.end_date' },

  // ID fields
  { from: /(\w+)\.studioId\b/g, to: '$1.studio_id' },
  { from: /(\w+)\.teacherId\b/g, to: '$1.teacher_id' },
  { from: /(\w+)\.groupId\b/g, to: '$1.group_id' },
  { from: /(\w+)\.clientId\b/g, to: '$1.client_id' },
  { from: /(\w+)\.roomId\b/g, to: '$1.room_id' },
  { from: /(\w+)\.userId\b/g, to: '$1.user_id' },
  { from: /(\w+)\.scheduleId\b/g, to: '$1.schedule_id' },
  { from: /(\w+)\.subscriptionId\b/g, to: '$1.subscription_id' },
  { from: /(\w+)\.subscriptionTypeId\b/g, to: '$1.subscription_type_id' },
  { from: /(\w+)\.leadSourceId\b/g, to: '$1.lead_source_id' },
  { from: /(\w+)\.relatedClientId\b/g, to: '$1.related_client_id' },
  { from: /(\w+)\.eventTypeId\b/g, to: '$1.event_type_id' },
  { from: /(\w+)\.managerId\b/g, to: '$1.manager_id' },
  { from: /(\w+)\.createdBy\b/g, to: '$1.created_by' },
  { from: /(\w+)\.updatedBy\b/g, to: '$1.updated_by' },

  // Name fields
  { from: /(\w+)\.firstName\b/g, to: '$1.first_name' },
  { from: /(\w+)\.lastName\b/g, to: '$1.last_name' },
  { from: /(\w+)\.middleName\b/g, to: '$1.middle_name' },

  // Other common fields
  { from: /(\w+)\.photoUrl\b/g, to: '$1.photo_url' },
  { from: /(\w+)\.salaryPercentage\b/g, to: '$1.salary_percentage' },
  { from: /(\w+)\.createdAt\b/g, to: '$1.created_at' },
  { from: /(\w+)\.updatedAt\b/g, to: '$1.updated_at' },
  { from: /(\w+)\.dateOfBirth\b/g, to: '$1.date_of_birth' },
  { from: /(\w+)\.maxParticipants\b/g, to: '$1.max_participants' },
  { from: /(\w+)\.singleSessionPrice\b/g, to: '$1.single_session_price' },
  { from: /(\w+)\.isActive\b/g, to: '$1.is_active' },
  { from: /(\w+)\.ageMin\b/g, to: '$1.age_min' },
  { from: /(\w+)\.ageMax\b/g, to: '$1.age_max' },
  { from: /(\w+)\.eventType\b/g, to: '$1.event_types' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply object field replacements
  objectFieldReplacements.forEach(({ from, to }) => {
    const newContent = content.replace(from, to);
    if (newContent !== content) {
      content = newContent;
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

console.log('🔧 Starting object field fixes...\n');

const srcDir = path.join(__dirname, 'src');
const updatedFiles = walkDir(srcDir);

console.log(`\n✅ Updated ${updatedFiles} files`);
console.log('🎉 Done!');
