import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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

async function checkImportedInAddresses() {
  console.log('='.repeat(80));
  console.log('🔍 ПРОВЕРКА НАЛИЧИЯ ИМПОРТИРОВАННЫХ КЛИЕНТОВ В ФАЙЛЕ АДРЕСОВ');
  console.log('='.repeat(80));

  // Получаем первых 10 импортированных клиентов
  const importedClients = await prisma.client.findMany({
    where: { clientType: 'INDIVIDUAL' },
    select: {
      firstName: true,
      lastName: true,
      middleName: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  console.log(`\n📋 Проверяем ${importedClients.length} клиентов\n`);

  // Читаем файл адресов
  const addressesData = readExcelFile(path.join(IMPORT_DIR, 'Адреса.xlsx'), 5);

  // Строим карту всех записей по клиентам (все типы)
  const allRecords = new Map<string, any[]>();
  addressesData.forEach(row => {
    const ref = row['Ссылка'];
    if (!ref) return;

    const key = ref.trim().toLowerCase();
    if (!allRecords.has(key)) {
      allRecords.set(key, []);
    }
    allRecords.get(key)!.push(row);
  });

  console.log(`📄 Всего уникальных клиентов в файле Адреса.xlsx: ${allRecords.size}\n`);
  console.log('='.repeat(80));

  for (const client of importedClients) {
    const fullName = `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim();
    const key = fullName.toLowerCase();

    console.log(`\n${fullName}`);
    console.log(`  Ключ: "${key}"`);

    const records = allRecords.get(key);
    if (records) {
      console.log(`  ✅ НАЙДЕН в файле - записей: ${records.length}`);
      records.forEach((rec, i) => {
        const pres = rec['Представление']?.substring(0, 60) || '';
        console.log(`    ${i + 1}. Тип: ${rec['Тип']}, Представление: ${pres}...`);
      });
    } else {
      console.log(`  ❌ НЕ НАЙДЕН в файле`);
      // Попробуем найти похожие
      const similar = [];
      for (const [k, recs] of allRecords.entries()) {
        if (k.includes(client.lastName.toLowerCase()) || k.includes(client.firstName.toLowerCase())) {
          similar.push(k);
          if (similar.length >= 3) break;
        }
      }
      if (similar.length > 0) {
        console.log(`  🔍 Похожие ключи в файле:`);
        similar.forEach(s => console.log(`     - "${s}"`));
      }
    }
  }

  await prisma.$disconnect();
}

checkImportedInAddresses().catch(console.error);
