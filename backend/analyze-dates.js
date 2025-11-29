const XLSX = require('xlsx');

const workbook = XLSX.readFile('/home/nikita/artsvao/import/Клиенты.xlsx', { cellDates: true });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

const headers = data[5];

console.log('Поля, связанные с датами:');
headers.forEach((header, idx) => {
  if (header && (
    header.toLowerCase().includes('дата') ||
    header.toLowerCase().includes('создан') ||
    header.toLowerCase().includes('регистр') ||
    header.toLowerCase().includes('timestamp')
  )) {
    console.log(`\n[${idx}] ${header}:`);
    // Покажем первые 5 примеров значений
    for (let i = 6; i < Math.min(11, data.length); i++) {
      const value = data[i][idx];
      if (value) {
        console.log(`  Строка ${i}: ${value} (тип: ${typeof value})`);
      }
    }
  }
});
