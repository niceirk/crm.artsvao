import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function removeExactDuplicates() {
  console.log('===========================================');
  console.log('УДАЛЕНИЕ ТОЧНЫХ ДУБЛИКАТОВ КЛИЕНТОВ');
  console.log('===========================================\n');

  // 1. Загружаем всех клиентов
  console.log('📖 Загрузка клиентов...');
  const allClients = await prisma.client.findMany({
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      dateOfBirth: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' } // Старейшие первые
  });

  console.log('   Всего клиентов:', allClients.length);

  // 2. Группируем по ТОЧНОМУ совпадению: ФИО + дата рождения + телефон
  console.log('\n🔍 Поиск точных дубликатов (ФИО + дата рождения + телефон)...');

  const groups = new Map<string, typeof allClients>();

  for (const client of allClients) {
    const key = [
      (client.lastName || '').toLowerCase().trim(),
      (client.firstName || '').toLowerCase().trim(),
      (client.middleName || '').toLowerCase().trim(),
      client.dateOfBirth?.toISOString().split('T')[0] || '',
      (client.phone || '').trim()
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(client);
  }

  // 3. Находим только группы с дубликатами
  const duplicateGroups = Array.from(groups.entries())
    .filter(([, clients]) => clients.length > 1);

  console.log('   Групп с точными дубликатами:', duplicateGroups.length);

  // Собираем ID для удаления (оставляем первый - самый старый)
  const idsToDelete: string[] = [];

  for (const [, clients] of duplicateGroups) {
    // Первый оставляем (он самый старый благодаря сортировке)
    const duplicates = clients.slice(1);
    for (const dup of duplicates) {
      idsToDelete.push(dup.id);
    }
  }

  console.log('   Клиентов к удалению:', idsToDelete.length);

  // 4. Показываем примеры для проверки
  console.log('\n📋 Примеры точных дубликатов (первые 5):');
  duplicateGroups.slice(0, 5).forEach(([key, clients]) => {
    const [lastName, firstName, middleName, dob, phone] = key.split('|');
    console.log(`\n   ${lastName} ${firstName} ${middleName} | ${dob} | ${phone}`);
    console.log(`   Записей: ${clients.length} (будет удалено: ${clients.length - 1})`);
    clients.forEach((c, i) => {
      console.log(`     ${i === 0 ? '✓ ОСТАВИТЬ' : '✗ удалить'}: ID ${c.id.slice(0,8)}... создан ${c.createdAt.toISOString().split('T')[0]}`);
    });
  });

  if (idsToDelete.length === 0) {
    console.log('\n✅ Точных дубликатов не найдено!');
    return;
  }

  // 5. Удаляем связанные данные batch-ом
  console.log('\n🗑️ Удаление связанных данных...');

  // Удаляем связи где дубликат является участником
  const deletedRelations = await prisma.clientRelation.deleteMany({
    where: {
      OR: [
        { clientId: { in: idsToDelete } },
        { relatedClientId: { in: idsToDelete } }
      ]
    }
  });
  console.log('   Удалено связей:', deletedRelations.count);

  // Удаляем документы
  const deletedDocs = await prisma.clientDocument.deleteMany({
    where: { clientId: { in: idsToDelete } }
  });
  console.log('   Удалено документов:', deletedDocs.count);

  // Удаляем заметки
  const deletedNotes = await prisma.clientNote.deleteMany({
    where: { clientId: { in: idsToDelete } }
  });
  console.log('   Удалено заметок:', deletedNotes.count);

  // 6. Удаляем дубликаты клиентов одним batch-запросом
  console.log('\n❌ Удаление дубликатов клиентов...');

  const deletedClients = await prisma.client.deleteMany({
    where: { id: { in: idsToDelete } }
  });
  console.log('   Удалено клиентов:', deletedClients.count);

  // 7. Итоговая статистика
  const finalCount = await prisma.client.count();

  console.log('\n===========================================');
  console.log('РЕЗУЛЬТАТЫ');
  console.log('===========================================');
  console.log('Клиентов было:', allClients.length);
  console.log('Клиентов стало:', finalCount);
  console.log('Удалено:', deletedClients.count);
  console.log('===========================================\n');
}

removeExactDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
