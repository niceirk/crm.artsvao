import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findDuplicates() {
  // Найдём дубликаты по ФИО + дата рождения через Prisma
  const allClients = await prisma.client.findMany({
    select: {
      id: true,
      lastName: true,
      firstName: true,
      middleName: true,
      dateOfBirth: true,
      phone: true,
      createdAt: true
    }
  });

  console.log('Всего клиентов в БД:', allClients.length);

  // Группируем по ФИО + дата рождения
  const groups = new Map<string, typeof allClients>();

  for (const client of allClients) {
    const key = [
      client.lastName?.toLowerCase() || '',
      client.firstName?.toLowerCase() || '',
      client.middleName?.toLowerCase() || '',
      client.dateOfBirth?.toISOString().split('T')[0] || ''
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(client);
  }

  // Находим дубликаты
  const duplicates = Array.from(groups.entries())
    .filter(([, clients]) => clients.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log('Групп с дубликатами:', duplicates.length);

  let extraRecords = 0;
  duplicates.forEach(([, clients]) => {
    extraRecords += clients.length - 1;
  });
  console.log('Лишних записей:', extraRecords);

  console.log('\nПримеры дубликатов (топ-10):');
  duplicates.slice(0, 10).forEach(([key, clients]) => {
    console.log(`\n  ${key} (${clients.length} записей):`);
    clients.forEach(c => {
      console.log(`    ID: ${c.id.slice(0,8)}... | тел: ${c.phone} | создан: ${c.createdAt.toISOString().split('T')[0]}`);
    });
  });

  // Проверяем Козловых
  console.log('\n\n=== КОЗЛОВЫ ===');
  const kozlovs = allClients
    .filter(c => c.lastName?.toLowerCase().includes('козлов'))
    .sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

  kozlovs.forEach(k => {
    console.log(`  ${k.lastName} ${k.firstName} ${k.middleName || ''} | ${k.phone} | ${k.dateOfBirth?.toISOString().split('T')[0] || 'нет'}`);
  });

  // Проверим связи Козловых
  console.log('\n=== СВЯЗИ КОЗЛОВЫХ ===');
  const kozlovIds = kozlovs.map(k => k.id);
  const relations = await prisma.clientRelation.findMany({
    where: {
      OR: [
        { clientId: { in: kozlovIds } },
        { relatedClientId: { in: kozlovIds } }
      ]
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
      relatedClient: { select: { firstName: true, lastName: true } }
    }
  });

  relations.forEach(r => {
    console.log(`  ${r.client.lastName} ${r.client.firstName} <-> ${r.relatedClient.lastName} ${r.relatedClient.firstName} | ${r.relationType}`);
  });
}

findDuplicates().catch(console.error).finally(() => prisma.$disconnect());
