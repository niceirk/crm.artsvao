const fs = require('fs');
const path = require('path');

const miscFixes = [
  // cancellation fields
  { from: /(\s+)cancellationReason(\s*[?:])/g, to: '$1cancellation_reason$2' },
  { from: /(\w+)\.cancellationReason\b/g, to: '$1.cancellation_reason' },

  // studio fields
  { from: /(\w+)\.studioNumber\b/g, to: '$1.studio_number' },
  { from: /(\s+)studioNumber(\s*[?:])/g, to: '$1studio_number$2' },

  // other common fields
  { from: /(\w+)\.contactInfo\b/g, to: '$1.contact_info' },
  { from: /(\s+)contactInfo(\s*[?:])/g, to: '$1contact_info$2' },

  { from: /(\w+)\.createdBy\b/g, to: '$1.created_by' },
  { from: /(\w+)\.updatedBy\b/g, to: '$1.updated_by' },

  // room fields
  { from: /(\s+)studioId(\s*[?:])/g, to: '$1studio_id$2' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  miscFixes.forEach(({ from, to }) => {
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

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist')) {
        updatedCount += walkDir(filePath);
      }
    } else if (/\.ts$/.test(file)) {
      if (processFile(filePath)) {
        console.log(`✓ Updated: ${filePath}`);
        updatedCount++;
      }
    }
  });

  return updatedCount;
}

console.log('🔧 Fixing cancellation and misc fields...\n');

const srcDir = path.join(__dirname, 'src');
const updatedFiles = walkDir(srcDir);

console.log(`\n✅ Updated ${updatedFiles} files`);
console.log('🎉 Done!');
