import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { createFullNameKey, buildDocumentsMap } from './import-utils';

const prisma = new PrismaClient();
const IMPORT_DIR = path.join(__dirname, '../../../import');

async function debugMatching() {
  console.log('='.repeat(80));
  console.log('🔍 ОТЛАДКА СОПОСТАВЛЕНИЯ ФИО');
  console.log('='.repeat(80));

  // Получаем клиентов из БД
  const clients = await prisma.client.findMany({
    where: { clientType: 'INDIVIDUAL' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      documents: true,
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📋 Проверяем ${clients.length} клиентов из БД:\n`);

  // Читаем файл документов
  const documentsWorkbook = XLSX.readFile(path.join(IMPORT_DIR, 'Документы.xlsx'));
  const documentsSheet = documentsWorkbook.Sheets[documentsWorkbook.SheetNames[0]];
  const documentsData = XLSX.utils.sheet_to_json(documentsSheet, { header: 1, defval: null });
  const documentsRows = documentsData.slice(7);

  const documentsMap = buildDocumentsMap(documentsRows as any);

  console.log(`\n📄 Всего уникальных ФИО в файле документов: ${documentsMap.size}`);
  console.log(`📄 Всего документов в файле: ${documentsRows.length}\n`);

  // Проверяем сопоставление
  for (const client of clients) {
    const key = createFullNameKey(client.lastName, client.firstName, client.middleName);
    const docsFromFile = documentsMap.get(key);

    console.log(`\n${client.lastName} ${client.firstName} ${client.middleName || ''}`);
    console.log(`  Ключ: "${key}"`);
    console.log(`  Документов в БД: ${client.documents.length}`);
    console.log(`  Документов в файле по этому ключу: ${docsFromFile ? docsFromFile.length : 0}`);

    if (docsFromFile && docsFromFile.length > 0) {
      console.log(`  ✅ СОПОСТАВЛЕНИЕ УСПЕШНО`);
      docsFromFile.forEach((doc, i) => {
        console.log(`    ${i + 1}. ${doc.documentType}: ${doc.series || ''} ${doc.number || ''}`);
      });
    } else {
      console.log(`  ❌ НЕТ СОПОСТАВЛЕНИЯ`);
    }
  }

  // Показываем первые 10 ключей из файла документов
  console.log('\n' + '='.repeat(80));
  console.log('📑 Первые 10 ключей ФИО из файла документов:');
  console.log('='.repeat(80));
  let count = 0;
  for (const [key, docs] of documentsMap.entries()) {
    if (count >= 10) break;
    console.log(`  "${key}" - документов: ${docs.length}`);
    count++;
  }

  // Проверяем СНИЛС
  console.log('\n' + '='.repeat(80));
  console.log('🔍 ПРОВЕРКА СНИЛС');
  console.log('='.repeat(80));

  const snilsWorkbook = XLSX.readFile(path.join(IMPORT_DIR, 'СНИЛС.xlsx'));
  const snilsSheet = snilsWorkbook.Sheets[snilsWorkbook.SheetNames[0]];
  const snilsData = XLSX.utils.sheet_to_json(snilsSheet, { header: 1, defval: null });

  console.log(`\nПервые строки СНИЛС файла:`);
  for (let i = 0; i < Math.min(10, snilsData.length); i++) {
    console.log(`  Строка ${i}:`, snilsData[i]);
  }

  await prisma.$disconnect();
}

debugMatching().catch(console.error);
