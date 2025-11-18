import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImportStats() {
  console.log('='.repeat(80));
  console.log('📊 СТАТИСТИКА ИМПОРТА КЛИЕНТОВ И ДОКУМЕНТОВ');
  console.log('='.repeat(80));

  // Общая статистика
  const totalClients = await prisma.client.count({
    where: { clientType: 'INDIVIDUAL' },
  });

  const clientsWithSnils = await prisma.client.count({
    where: {
      clientType: 'INDIVIDUAL',
      snils: { not: null },
    },
  });

  const clientsWithDocs = await prisma.client.count({
    where: {
      clientType: 'INDIVIDUAL',
      documents: { some: {} },
    },
  });

  console.log('\n📈 Общая статистика:');
  console.log(`   Всего физических лиц:           ${totalClients}`);
  console.log(`   Клиентов с СНИЛС в поле snils:  ${clientsWithSnils} (${((clientsWithSnils / totalClients) * 100).toFixed(1)}%)`);
  console.log(`   Клиентов с документами:         ${clientsWithDocs} (${((clientsWithDocs / totalClients) * 100).toFixed(1)}%)`);
  console.log(`   Клиентов БЕЗ документов:        ${totalClients - clientsWithDocs} (${(((totalClients - clientsWithDocs) / totalClients) * 100).toFixed(1)}%)`);

  // Статистика по типам документов
  const docStats = await prisma.clientDocument.groupBy({
    by: ['documentType'],
    _count: true,
  });

  console.log('\n📄 Статистика по типам документов:');
  for (const stat of docStats) {
    console.log(`   ${stat.documentType}: ${stat._count} документов`);
  }

  const totalDocs = docStats.reduce((sum, s) => sum + s._count, 0);
  console.log(`   ВСЕГО документов: ${totalDocs}`);

  // Примеры клиентов с документами
  console.log('\n✅ Примеры клиентов С документами:');
  const clientsWithDocuments = await prisma.client.findMany({
    where: {
      clientType: 'INDIVIDUAL',
      documents: { some: {} },
    },
    include: {
      documents: true,
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  for (const client of clientsWithDocuments) {
    console.log(`   ${client.lastName} ${client.firstName} ${client.middleName || ''}`);
    console.log(`     СНИЛС в поле: ${client.snils || 'нет'}`);
    console.log(`     Документов: ${client.documents.length}`);
    for (const doc of client.documents) {
      console.log(`       - ${doc.documentType}: ${doc.series || ''} ${doc.number || ''}`);
    }
  }

  // Примеры клиентов без документов
  console.log('\n❌ Примеры клиентов БЕЗ документов:');
  const clientsWithoutDocuments = await prisma.client.findMany({
    where: {
      clientType: 'INDIVIDUAL',
      documents: { none: {} },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  for (const client of clientsWithoutDocuments) {
    console.log(`   ${client.lastName} ${client.firstName} ${client.middleName || ''} - СНИЛС: ${client.snils || 'нет'}`);
  }

  // Проверим файл Адреса
  console.log('\n🏠 Проверка адресов:');
  const clientsWithAddress = await prisma.client.count({
    where: {
      clientType: 'INDIVIDUAL',
      address: { not: null },
    },
  });
  console.log(`   Клиентов с адресом: ${clientsWithAddress} (${((clientsWithAddress / totalClients) * 100).toFixed(1)}%)`);

  await prisma.$disconnect();
}

checkImportStats().catch(console.error);
