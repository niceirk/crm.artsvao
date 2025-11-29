const XLSX = require('xlsx');

const workbook = XLSX.readFile('/home/nikita/artsvao/import/Клиенты.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Служебные строки 0-5, заголовки в строке 5
console.log('Заголовки (строка 5):');
const headers = data[5];
headers.forEach((header, idx) => {
  if (header) {
    console.log(`  [${idx}] ${header}`);
  }
});

console.log('\nПример первой строки данных (строка 6):');
const firstRow = data[6];
headers.forEach((header, idx) => {
  if (header && firstRow[idx]) {
    console.log(`  ${header}: ${firstRow[idx]}`);
  }
});

// Поиск колонки структурного подразделения
console.log('\nПоиск колонки со структурным подразделением...');
const structureIdx = headers.findIndex(h => h && (h.includes('структур') || h.includes('подразделен')));
if (structureIdx !== -1) {
  console.log(`  Найдена колонка: [${structureIdx}] "${headers[structureIdx]}"`);
  console.log(`  Пример значения: "${firstRow[structureIdx]}"`);
}

// Поиск колонки даты создания
console.log('\nПоиск колонки с датой создания...');
const dateIdx = headers.findIndex(h => h && (h.includes('Дата создания') || h.includes('Создан')));
if (dateIdx !== -1) {
  console.log(`  Найдена колонка: [${dateIdx}] "${headers[dateIdx]}"`);
  console.log(`  Пример значения: "${firstRow[dateIdx]}"`);
}
