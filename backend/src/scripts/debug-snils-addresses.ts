import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeSnils, extractAddress, createFullNameKey } from './import-utils';

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

async function debugSnilsAddresses() {
  console.log('='.repeat(80));
  console.log('🔍 ОТЛАДКА ИМПОРТА СНИЛС И АДРЕСОВ');
  console.log('='.repeat(80));

  // Читаем СНИЛС
  console.log('\n📋 Чтение файла СНИЛС...');
  const snilsData = readExcelFile(path.join(IMPORT_DIR, 'СНИЛС.xlsx'), 5);
  console.log(`   Прочитано ${snilsData.length} записей`);

  console.log('\n   Первые 5 записей СНИЛС:');
  snilsData.slice(0, 5).forEach((row, i) => {
    console.log(`   ${i + 1}. Ссылка: "${row['Ссылка']}", Значение: "${row['Значение']}"`);
  });

  // Строим карту СНИЛС
  const snilsMap = new Map<string, string>();
  snilsData.forEach(row => {
    const fullName = row['Ссылка'];
    const snilsValue = row['Значение'];

    if (fullName && snilsValue) {
      const key = fullName.trim().toLowerCase();
      const normalized = normalizeSnils(String(snilsValue));
      if (normalized) {
        snilsMap.set(key, normalized);
      }
    }
  });

  console.log(`\n   Обработано ${snilsMap.size} уникальных СНИЛС`);

  // Читаем адреса
  console.log('\n📋 Чтение файла Адреса...');
  const addressesData = readExcelFile(path.join(IMPORT_DIR, 'Адреса.xlsx'), 5);
  console.log(`   Прочитано ${addressesData.length} записей`);

  console.log('\n   Первые 10 записей Адреса:');
  addressesData.slice(0, 10).forEach((row, i) => {
    console.log(`   ${i + 1}. Ссылка: "${row['Ссылка']}", Тип: "${row['Тип']}", Представление: "${row['Представление']?.substring(0, 50) || ''}..."`);
  });

  // Строим карту контактов
  const contactsMap = new Map<string, { addresses: string[], emails: string[], phones: string[] }>();
  addressesData.forEach(row => {
    const fullName = row['Ссылка'];
    const type = row['Тип'];
    const presentation = row['Представление'];

    if (!fullName) return;

    const key = fullName.trim().toLowerCase();

    if (!contactsMap.has(key)) {
      contactsMap.set(key, { addresses: [], emails: [], phones: [] });
    }

    const contacts = contactsMap.get(key)!;

    if (type === 'Адрес' && presentation) {
      const address = extractAddress(presentation);
      if (address && !contacts.addresses.includes(address)) {
        contacts.addresses.push(address);
      }
    }
  });

  console.log(`\n   Обработано ${contactsMap.size} уникальных клиентов с контактами`);

  // Считаем сколько с адресами
  let withAddresses = 0;
  contactsMap.forEach(contacts => {
    if (contacts.addresses.length > 0) withAddresses++;
  });
  console.log(`   Из них с адресами: ${withAddresses}`);

  // Проверяем сопоставление с клиентами из БД
  console.log('\n' + '='.repeat(80));
  console.log('🔍 СОПОСТАВЛЕНИЕ С КЛИЕНТАМИ ИЗ БД');
  console.log('='.repeat(80));

  const clients = await prisma.client.findMany({
    where: { clientType: 'INDIVIDUAL' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      snils: true,
      address: true,
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 Проверяем ${clients.length} клиентов:\n`);

  let matchedSnils = 0;
  let matchedAddresses = 0;

  for (const client of clients) {
    const fullName = `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim();
    const fullNameKey = createFullNameKey(client.lastName, client.firstName, client.middleName);

    const snilsFromFile = snilsMap.get(fullName.toLowerCase());
    const contactsFromFile = contactsMap.get(fullName.toLowerCase());

    console.log(`\n${fullName}`);
    console.log(`  Ключ ФИО: "${fullNameKey}"`);
    console.log(`  Ключ из файла: "${fullName.toLowerCase()}"`);
    console.log(`  СНИЛС в БД: ${client.snils || 'нет'}`);
    console.log(`  СНИЛС в файле: ${snilsFromFile || 'нет'}`);

    if (snilsFromFile) {
      matchedSnils++;
      if (!client.snils) {
        console.log(`  ❗ СНИЛС ЕСТЬ В ФАЙЛЕ, НО НЕ ИМПОРТИРОВАН!`);
      }
    }

    console.log(`  Адрес в БД: ${client.address || 'нет'}`);
    console.log(`  Адресов в файле: ${contactsFromFile?.addresses.length || 0}`);
    if (contactsFromFile && contactsFromFile.addresses.length > 0) {
      matchedAddresses++;
      contactsFromFile.addresses.forEach((addr, i) => {
        console.log(`    ${i + 1}. ${addr}`);
      });
      if (!client.address) {
        console.log(`  ❗ АДРЕС ЕСТЬ В ФАЙЛЕ, НО НЕ ИМПОРТИРОВАН!`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
  console.log('='.repeat(80));
  console.log(`  Клиентов проверено: ${clients.length}`);
  console.log(`  Найдено СНИЛС в файле: ${matchedSnils}`);
  console.log(`  Найдено адресов в файле: ${matchedAddresses}`);

  await prisma.$disconnect();
}

debugSnilsAddresses().catch(console.error);
