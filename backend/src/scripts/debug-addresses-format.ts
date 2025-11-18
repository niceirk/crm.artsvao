import * as XLSX from 'xlsx';
import * as path from 'path';

const IMPORT_DIR = path.join(__dirname, '../../../import');

function readExcelFile(filePath: string, headerRow: number = 5): any[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  const headers = rawData[headerRow];
  const dataRows = rawData.slice(headerRow + 1);

  return dataRows.map(row => {
    const obj: any = {};
    headers.forEach((header, idx) => {
      if (header) {
        obj[header] = row[idx];
      }
    });
    return obj;
  });
}

async function debugAddressFormat() {
  console.log('='.repeat(80));
  console.log('🔍 ОТЛАДКА ФОРМАТА ФАЙЛА АДРЕСА');
  console.log('='.repeat(80));

  const addressesData = readExcelFile(path.join(IMPORT_DIR, 'Адреса.xlsx'), 5);
  console.log(`\n📄 Всего записей: ${addressesData.length}\n`);

  // Показываем первые 30 записей
  console.log('📋 Первые 30 записей:\n');
  addressesData.slice(0, 30).forEach((row, i) => {
    console.log(`${i + 1}.`);
    console.log(`  Ссылка: "${row['Ссылка']}"`);
    console.log(`  Тип: "${row['Тип']}"`);
    console.log(`  Представление: "${row['Представление']?.substring(0, 100) || ''}..."`);
    console.log();
  });

  // Подсчитываем типы
  const typeCount = new Map<string, number>();
  addressesData.forEach(row => {
    const type = row['Тип'];
    if (type) {
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }
  });

  console.log('='.repeat(80));
  console.log('📊 Статистика по типам:');
  console.log('='.repeat(80));
  for (const [type, count] of typeCount.entries()) {
    console.log(`  ${type}: ${count}`);
  }

  // Находим записи с типом "Адрес"
  const addressRecords = addressesData.filter(row => row['Тип'] === 'Адрес');
  console.log(`\n📍 Записей с типом "Адрес": ${addressRecords.length}`);

  if (addressRecords.length > 0) {
    console.log('\n📋 Первые 10 записей с типом "Адрес":\n');
    addressRecords.slice(0, 10).forEach((row, i) => {
      console.log(`${i + 1}.`);
      console.log(`  Ссылка: "${row['Ссылка']}"`);
      console.log(`  Представление: "${row['Представление']}"`);
      console.log();
    });
  }
}

debugAddressFormat().catch(console.error);
