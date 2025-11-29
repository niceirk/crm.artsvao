import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phone: string;
  dateOfBirth: Date | null;
}

interface PhoneGroup {
  phone: string;
  clients: ClientInfo[];
  hasRelations: boolean;
}

async function checkPhoneRelations() {
  console.log('=== Анализ связей клиентов по телефону ===\n');

  // 1. Загружаем всех клиентов
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      phone: true,
      dateOfBirth: true,
    },
    where: {
      status: 'ACTIVE',
    },
  });

  console.log(`Всего активных клиентов: ${clients.length}`);

  // 2. Группируем по телефону
  const phoneGroups = new Map<string, ClientInfo[]>();

  for (const client of clients) {
    const phone = client.phone?.trim();
    if (!phone || phone === '+70000000000') continue; // Пропускаем пустые и фейковые

    if (!phoneGroups.has(phone)) {
      phoneGroups.set(phone, []);
    }
    phoneGroups.get(phone)!.push(client);
  }

  console.log(`Уникальных телефонов: ${phoneGroups.size}`);

  // Фильтруем группы с 2+ клиентами
  const multiClientGroups: PhoneGroup[] = [];
  for (const [phone, groupClients] of phoneGroups) {
    if (groupClients.length >= 2) {
      multiClientGroups.push({
        phone,
        clients: groupClients,
        hasRelations: false,
      });
    }
  }

  console.log(`Групп с общим телефоном (2+ чел): ${multiClientGroups.length}`);

  // 3. Загружаем все связи
  const relations = await prisma.clientRelation.findMany({
    select: {
      clientId: true,
      relatedClientId: true,
    },
  });

  console.log(`Всего связей в базе: ${relations.length}`);

  // Создаём Set для быстрой проверки связей
  const relationPairs = new Set<string>();
  for (const rel of relations) {
    // Добавляем в обе стороны
    relationPairs.add(`${rel.clientId}:${rel.relatedClientId}`);
    relationPairs.add(`${rel.relatedClientId}:${rel.clientId}`);
  }

  // 4. Проверяем каждую группу на наличие связей
  let linkedGroups = 0;
  let unlinkedGroups = 0;
  const unlinkedGroupsList: PhoneGroup[] = [];

  for (const group of multiClientGroups) {
    // Проверяем, связаны ли ВСЕ клиенты в группе между собой
    let allLinked = true;
    const clientIds = group.clients.map((c) => c.id);

    for (let i = 0; i < clientIds.length && allLinked; i++) {
      for (let j = i + 1; j < clientIds.length && allLinked; j++) {
        const key = `${clientIds[i]}:${clientIds[j]}`;
        if (!relationPairs.has(key)) {
          allLinked = false;
        }
      }
    }

    group.hasRelations = allLinked;
    if (allLinked) {
      linkedGroups++;
    } else {
      unlinkedGroups++;
      unlinkedGroupsList.push(group);
    }
  }

  console.log(`\n=== Результат ===`);
  console.log(`Полностью связанных групп: ${linkedGroups}`);
  console.log(`Несвязанных/частично связанных групп: ${unlinkedGroups}`);

  // 5. Выводим несвязанные группы
  if (unlinkedGroupsList.length > 0) {
    console.log(`\n=== Несвязанные группы (первые 30) ===\n`);

    const toShow = unlinkedGroupsList.slice(0, 30);
    for (const group of toShow) {
      console.log(`Телефон: ${group.phone} (${group.clients.length} клиентов)`);
      for (const client of group.clients) {
        const dob = client.dateOfBirth
          ? client.dateOfBirth.toLocaleDateString('ru-RU')
          : 'нет даты';
        const fullName = [client.lastName, client.firstName, client.middleName]
          .filter(Boolean)
          .join(' ');
        console.log(`  - ${fullName} (${dob}) [${client.id}]`);
      }
      console.log('');
    }

    if (unlinkedGroupsList.length > 30) {
      console.log(`... и ещё ${unlinkedGroupsList.length - 30} групп`);
    }
  } else {
    console.log('\nВсе группы клиентов с общим телефоном уже связаны!');
  }

  // 6. Статистика по размерам групп
  console.log(`\n=== Статистика по размерам несвязанных групп ===`);
  const sizeStats = new Map<number, number>();
  for (const group of unlinkedGroupsList) {
    const size = group.clients.length;
    sizeStats.set(size, (sizeStats.get(size) || 0) + 1);
  }

  for (const [size, count] of Array.from(sizeStats.entries()).sort(
    (a, b) => a[0] - b[0],
  )) {
    console.log(`  ${size} клиентов: ${count} групп`);
  }
}

checkPhoneRelations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
