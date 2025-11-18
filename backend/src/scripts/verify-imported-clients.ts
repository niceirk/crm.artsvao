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

function extractAddress(presentation: string): string | null {
  if (!presentation) return null;
  // В файле Адреса.xlsx адрес хранится напрямую в поле Представление
  return presentation.trim();
}

async function verifyImportedClients() {
  console.log('='.repeat(80));
  console.log('🔍 ПРОВЕРКА ИМПОРТИРОВАННЫХ КЛИЕНТОВ И ИХ АДРЕСОВ');
  console.log('='.repeat(80));

  // Получаем первых 20 импортированных клиентов
  const importedClients = await prisma.client.findMany({
    where: { clientType: 'INDIVIDUAL' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      address: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  console.log(`\n📋 Проверяем первых ${importedClients.length} импортированных клиентов:\n`);

  // Читаем файл адресов
  const addressesData = readExcelFile(path.join(IMPORT_DIR, 'Адреса.xlsx'), 5);
  console.log(`📄 В файле Адреса.xlsx: ${addressesData.length} записей\n`);

  // Строим карту адресов по ФИО
  const addressMap = new Map<string, string[]>();
  addressesData.forEach(row => {
    const fullName = row['Ссылка'];
    const type = row['Тип'];
    const presentation = row['Представление'];

    if (!fullName) return;

    const key = fullName.trim().toLowerCase();

    if (type === 'Адрес' && presentation) {
      const address = extractAddress(presentation);
      if (address) {
        if (!addressMap.has(key)) {
          addressMap.set(key, []);
        }
        if (!addressMap.get(key)!.includes(address)) {
          addressMap.get(key)!.push(address);
        }
      }
    }
  });

  console.log(`📍 Уникальных клиентов с адресами в файле: ${addressMap.size}\n`);
  console.log('='.repeat(80));

  let foundInFile = 0;
  let hasAddressInFile = 0;
  let importedCorrectly = 0;
  let shouldHaveAddress = 0;

  for (const client of importedClients) {
    const fullName = `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim();
    const key = fullName.toLowerCase();

    const addressesInFile = addressMap.get(key);

    console.log(`\n${fullName}`);
    console.log(`  Создан: ${client.createdAt.toISOString()}`);
    console.log(`  Ключ поиска: "${key}"`);

    if (addressesInFile) {
      foundInFile++;
      if (addressesInFile.length > 0) {
        hasAddressInFile++;
        console.log(`  ✅ Найден в файле адресов`);
        console.log(`  📍 Адресов в файле: ${addressesInFile.length}`);
        addressesInFile.forEach((addr, i) => {
          console.log(`     ${i + 1}. ${addr}`);
        });

        if (client.address) {
          importedCorrectly++;
          console.log(`  ✅ Адрес импортирован: "${client.address}"`);
        } else {
          shouldHaveAddress++;
          console.log(`  ❌ АДРЕС НЕ ИМПОРТИРОВАН! Должен был быть: "${addressesInFile[0]}"`);
        }
      } else {
        console.log(`  ⚠️  Найден в файле, но без адресов`);
      }
    } else {
      console.log(`  ❌ НЕ найден в файле адресов`);
    }

    if (!addressesInFile && client.address) {
      console.log(`  ⚠️  В БД есть адрес, но его нет в файле: "${client.address}"`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(80));
  console.log(`  Всего проверено клиентов: ${importedClients.length}`);
  console.log(`  Найдено в файле адресов: ${foundInFile} (${((foundInFile / importedClients.length) * 100).toFixed(1)}%)`);
  console.log(`  Из них с адресами в файле: ${hasAddressInFile} (${((hasAddressInFile / importedClients.length) * 100).toFixed(1)}%)`);
  console.log(`  Импортировано правильно: ${importedCorrectly} (${hasAddressInFile > 0 ? ((importedCorrectly / hasAddressInFile) * 100).toFixed(1) : 0}%)`);
  console.log(`  НЕ импортировано (ошибка): ${shouldHaveAddress} (${hasAddressInFile > 0 ? ((shouldHaveAddress / hasAddressInFile) * 100).toFixed(1) : 0}%)`);

  await prisma.$disconnect();
}

verifyImportedClients().catch(console.error);
