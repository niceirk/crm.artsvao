const XLSX = require('xlsx');

const workbook = XLSX.readFile('/home/nikita/artsvao/import/Документы.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Пропускаем служебные строки (0-6), заголовки в строке 6
const documentTypes = new Set();

for (let i = 7; i < data.length; i++) {
  const row = data[i];
  const docType = row[0]; // Колонка "Вид документа"

  if (docType && docType.trim()) {
    documentTypes.add(docType.trim());
  }
}

console.log('Уникальные типы документов:');
console.log('Всего типов:', documentTypes.size);
console.log('---');

const sortedTypes = Array.from(documentTypes).sort();
sortedTypes.forEach((type, index) => {
  console.log(`${index + 1}. ${type}`);
});
