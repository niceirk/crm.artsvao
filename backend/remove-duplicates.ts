import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function removeDuplicates() {
  console.log('===========================================');
  console.log('УДАЛЕНИЕ ДУБЛИКАТОВ КЛИЕНТОВ');
  console.log('===========================================\n');

  // 1. Загружаем всех клиентов
  const allClients = await prisma.client.findMany({
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      dateOfBirth: true,
      phone: true,
      email: true,
      createdAt: true,
    }
  });

  console.log('Всего клиентов в БД:', allClients.length);

  // 2. Группируем по ФИО + дата рождения
  const groups = new Map<string, typeof allClients>();

  for (const client of allClients) {
    const key = [
      client.lastName?.toLowerCase().trim() || '',
      client.firstName?.toLowerCase().trim() || '',
      client.middleName?.toLowerCase().trim() || '',
      client.dateOfBirth?.toISOString().split('T')[0] || ''
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(client);
  }

  // 3. Находим группы с дубликатами
  const duplicateGroups = Array.from(groups.entries())
    .filter(([, clients]) => clients.length > 1);

  console.log('Групп с дубликатами:', duplicateGroups.length);

  let totalToDelete = 0;
  const idsToDelete: string[] = [];
  const idMapping = new Map<string, string>(); // oldId -> keepId

  for (const [key, clients] of duplicateGroups) {
    // Выбираем лучшего клиента: приоритет - с реальным телефоном, потом по дате создания (старейший)
    const sorted = clients.sort((a, b) => {
      // Приоритет реального телефона
      const aHasPhone = a.phone && a.phone !== '+70000000000' ? 1 : 0;
      const bHasPhone = b.phone && b.phone !== '+70000000000' ? 1 : 0;
      if (aHasPhone !== bHasPhone) return bHasPhone - aHasPhone;

      // Приоритет email
      const aHasEmail = a.email ? 1 : 0;
      const bHasEmail = b.email ? 1 : 0;
      if (aHasEmail !== bHasEmail) return bHasEmail - aHasEmail;

      // По дате создания (старейший)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const keepClient = sorted[0];
    const duplicates = sorted.slice(1);

    for (const dup of duplicates) {
      idsToDelete.push(dup.id);
      idMapping.set(dup.id, keepClient.id);
    }

    totalToDelete += duplicates.length;
  }

  console.log('Клиентов к удалению:', totalToDelete);

  // 4. Удаляем самосвязи (когда клиент связан сам с собой)
  console.log('\n📋 Удаление самосвязей...');
  const selfRelations = await prisma.clientRelation.deleteMany({
    where: {
      OR: idsToDelete.map(id => ({
        AND: [
          { clientId: id },
          { relatedClientId: idMapping.get(id) }
        ]
      }))
    }
  });
  console.log('   Удалено самосвязей:', selfRelations.count);

  // 5. Обновляем связи - заменяем старые ID на новые
  console.log('\n🔄 Обновление связей...');

  let updatedRelations = 0;
  for (const [oldId, newId] of idMapping) {
    // Обновляем clientId
    const r1 = await prisma.clientRelation.updateMany({
      where: { clientId: oldId },
      data: { clientId: newId }
    });

    // Обновляем relatedClientId
    const r2 = await prisma.clientRelation.updateMany({
      where: { relatedClientId: oldId },
      data: { relatedClientId: newId }
    });

    updatedRelations += r1.count + r2.count;
  }
  console.log('   Обновлено связей:', updatedRelations);

  // 6. Удаляем дубликаты связей (могут появиться после объединения)
  console.log('\n🧹 Очистка дубликатов связей...');

  // Сначала найдём дубликаты связей
  const allRelations = await prisma.clientRelation.findMany();
  const relationKeys = new Set<string>();
  const relationIdsToDelete: string[] = [];

  for (const rel of allRelations) {
    // Также удаляем самосвязи
    if (rel.clientId === rel.relatedClientId) {
      relationIdsToDelete.push(rel.id);
      continue;
    }

    const key = `${rel.clientId}|${rel.relatedClientId}|${rel.relationType}`;
    if (relationKeys.has(key)) {
      relationIdsToDelete.push(rel.id);
    } else {
      relationKeys.add(key);
    }
  }

  if (relationIdsToDelete.length > 0) {
    await prisma.clientRelation.deleteMany({
      where: { id: { in: relationIdsToDelete } }
    });
    console.log('   Удалено дубликатов/самосвязей:', relationIdsToDelete.length);
  }

  // 7. Удаляем связанные данные дубликатов (документы, заметки и т.д.)
  console.log('\n🗑️ Удаление связанных данных дубликатов...');

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

  // 8. Удаляем дубликаты клиентов
  console.log('\n❌ Удаление дубликатов клиентов...');

  // Удаляем пакетами по 100
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const result = await prisma.client.deleteMany({
      where: { id: { in: batch } }
    });
    deleted += result.count;
    console.log(`   Удалено: ${deleted}/${idsToDelete.length}`);
  }

  // 9. Итоговая статистика
  const finalCount = await prisma.client.count();
  const finalRelations = await prisma.clientRelation.count();

  console.log('\n===========================================');
  console.log('РЕЗУЛЬТАТЫ');
  console.log('===========================================');
  console.log('Клиентов было:', allClients.length);
  console.log('Клиентов стало:', finalCount);
  console.log('Удалено клиентов:', deleted);
  console.log('Связей в БД:', finalRelations);
  console.log('===========================================\n');
}

removeDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
