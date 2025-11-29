import { PrismaClient, RelationType, Gender } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phone: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
}

interface RelationToCreate {
  clientId: string;
  relatedClientId: string;
  relationType: RelationType;
  description: string;
}

// =============== Вспомогательные функции ===============

/**
 * Вычисляет возраст по дате рождения
 */
function getAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Проверяет, является ли человек совершеннолетним (18+)
 */
function isAdult(dateOfBirth: Date | null): boolean {
  const age = getAge(dateOfBirth);
  return age !== null && age >= 18;
}

/**
 * Преобразует имя в отчество
 * Иван → Иванович/Ивановна
 * Александр → Александрович/Александровна
 */
function nameToPatronymic(firstName: string): { male: string; female: string } {
  const name = firstName.trim().toLowerCase();

  // Особые случаи
  const specialCases: Record<string, { male: string; female: string }> = {
    'илья': { male: 'Ильич', female: 'Ильинична' },
    'лев': { male: 'Львович', female: 'Львовна' },
    'павел': { male: 'Павлович', female: 'Павловна' },
    'яков': { male: 'Яковлевич', female: 'Яковлевна' },
    'никита': { male: 'Никитич', female: 'Никитична' },
    'фома': { male: 'Фомич', female: 'Фоминична' },
    'кузьма': { male: 'Кузьмич', female: 'Кузьминична' },
  };

  if (specialCases[name]) {
    return specialCases[name];
  }

  // Общие правила
  let stem = firstName;

  // Убираем окончание
  if (name.endsWith('ий') || name.endsWith('ей')) {
    stem = firstName.slice(0, -2);
    return { male: stem + 'ьевич', female: stem + 'ьевна' };
  }
  if (name.endsWith('й')) {
    stem = firstName.slice(0, -1);
    return { male: stem + 'евич', female: stem + 'евна' };
  }
  if (name.endsWith('а') || name.endsWith('я')) {
    stem = firstName.slice(0, -1);
    return { male: stem + 'ич', female: stem + 'ична' };
  }

  // Согласные на конце
  return { male: firstName + 'ович', female: firstName + 'овна' };
}

/**
 * Проверяет, соответствует ли отчество имени (отец)
 */
function isPatronymicFromName(patronymic: string | null, fatherName: string): boolean {
  if (!patronymic || !fatherName) return false;

  const expected = nameToPatronymic(fatherName);
  const normalizedPatronymic = patronymic.trim().toLowerCase();

  return (
    normalizedPatronymic === expected.male.toLowerCase() ||
    normalizedPatronymic === expected.female.toLowerCase()
  );
}

/**
 * Сравнивает фамилии с учётом мужской/женской формы
 * Иванов ↔ Иванова, Петров ↔ Петрова
 */
function sameFamilyName(lastName1: string, lastName2: string): boolean {
  const normalize = (name: string) => {
    const n = name.trim().toLowerCase();
    // Убираем женское окончание -а/-ая
    if (n.endsWith('ова')) return n.slice(0, -1); // Иванова → Иванов
    if (n.endsWith('ева')) return n.slice(0, -1); // Андреева → Андреев
    if (n.endsWith('ина')) return n.slice(0, -1); // Ильина → Ильин
    if (n.endsWith('ая')) return n.slice(0, -2) + 'ий'; // Долгая → Долгий
    return n;
  };

  return normalize(lastName1) === normalize(lastName2);
}

/**
 * Разница в возрасте между двумя клиентами
 */
function ageDifference(client1: ClientInfo, client2: ClientInfo): number | null {
  const age1 = getAge(client1.dateOfBirth);
  const age2 = getAge(client2.dateOfBirth);
  if (age1 === null || age2 === null) return null;
  return Math.abs(age1 - age2);
}

/**
 * Определяет кто старше
 */
function isOlder(client1: ClientInfo, client2: ClientInfo): boolean {
  if (!client1.dateOfBirth || !client2.dateOfBirth) return false;
  return client1.dateOfBirth < client2.dateOfBirth;
}

// =============== Основная логика ===============

/**
 * Определяет тип связи между двумя клиентами
 */
function determineRelationType(
  client1: ClientInfo,
  client2: ClientInfo
): { type: RelationType; reason: string } {
  const diff = ageDifference(client1, client2);
  const adult1 = isAdult(client1.dateOfBirth);
  const adult2 = isAdult(client2.dateOfBirth);
  const sameFamily = sameFamilyName(client1.lastName, client2.lastName);

  // 1. Проверка отца по отчеству
  // Если отчество client1 соответствует имени client2 → client2 отец client1
  if (isPatronymicFromName(client1.middleName, client2.firstName)) {
    return { type: RelationType.PARENT, reason: 'отец по отчеству' };
  }
  // Если отчество client2 соответствует имени client1 → client1 отец client2
  if (isPatronymicFromName(client2.middleName, client1.firstName)) {
    return { type: RelationType.CHILD, reason: 'ребёнок (отец по отчеству)' };
  }

  // 2. Супруги: оба взрослые, разница < 20 лет, разные фамилии
  if (adult1 && adult2 && diff !== null && diff < 20 && !sameFamily) {
    return { type: RelationType.SPOUSE, reason: 'супруги (взрослые, разные фамилии)' };
  }

  // 3. Родитель/ребёнок: разница >= 15 лет
  if (diff !== null && diff >= 15) {
    if (isOlder(client1, client2)) {
      return { type: RelationType.CHILD, reason: `ребёнок (разница ${diff} лет)` };
    } else {
      return { type: RelationType.PARENT, reason: `родитель (разница ${diff} лет)` };
    }
  }

  // 4. Братья/сёстры: разница < 15 лет, одинаковая фамилия
  if (diff !== null && diff < 15 && sameFamily) {
    return { type: RelationType.SIBLING, reason: `брат/сестра (разница ${diff} лет)` };
  }

  // 5. По умолчанию - SIBLING
  return { type: RelationType.SIBLING, reason: 'по умолчанию' };
}

/**
 * Форматирует клиента для вывода
 */
function formatClient(client: ClientInfo): string {
  const age = getAge(client.dateOfBirth);
  const ageStr = age !== null ? `${age} лет` : 'нет даты';
  const fullName = [client.lastName, client.firstName, client.middleName].filter(Boolean).join(' ');
  return `${fullName} (${ageStr})`;
}

/**
 * Обрабатывает группу клиентов с одинаковым телефоном
 */
function processGroup(
  clients: ClientInfo[],
  existingRelationPairs: Set<string>
): RelationToCreate[] {
  const relations: RelationToCreate[] = [];

  // Создаём связи между всеми парами клиентов
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const client1 = clients[i];
      const client2 = clients[j];

      // Проверяем, существует ли уже связь
      const key1 = `${client1.id}:${client2.id}`;
      const key2 = `${client2.id}:${client1.id}`;
      if (existingRelationPairs.has(key1) || existingRelationPairs.has(key2)) {
        continue;
      }

      // Определяем тип связи
      const { type, reason } = determineRelationType(client1, client2);

      relations.push({
        clientId: client1.id,
        relatedClientId: client2.id,
        relationType: type,
        description: `${formatClient(client1)} → ${formatClient(client2)}: ${type} (${reason})`,
      });
    }
  }

  return relations;
}

// =============== Main ===============

async function linkClientsByPhone() {
  console.log('=== Связывание клиентов по телефону ===');
  console.log(`Режим: ${DRY_RUN ? 'DRY-RUN (без изменений)' : 'РЕАЛЬНОЕ ВЫПОЛНЕНИЕ'}\n`);

  // 1. Загружаем всех клиентов
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      middleName: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
    },
    where: {
      status: 'ACTIVE',
    },
  });

  console.log(`Загружено клиентов: ${clients.length}`);

  // 2. Группируем по телефону
  const phoneGroups = new Map<string, ClientInfo[]>();
  for (const client of clients) {
    const phone = client.phone?.trim();
    if (!phone || phone === '+70000000000') continue;

    if (!phoneGroups.has(phone)) {
      phoneGroups.set(phone, []);
    }
    phoneGroups.get(phone)!.push(client);
  }

  // 3. Загружаем существующие связи
  const existingRelations = await prisma.clientRelation.findMany({
    select: { clientId: true, relatedClientId: true },
  });

  const existingPairs = new Set<string>();
  for (const rel of existingRelations) {
    existingPairs.add(`${rel.clientId}:${rel.relatedClientId}`);
    existingPairs.add(`${rel.relatedClientId}:${rel.clientId}`);
  }

  console.log(`Существующих связей: ${existingRelations.length}`);

  // 4. Обрабатываем группы
  const allRelationsToCreate: RelationToCreate[] = [];
  let processedGroups = 0;

  for (const [phone, groupClients] of phoneGroups) {
    if (groupClients.length < 2) continue;

    const newRelations = processGroup(groupClients, existingPairs);
    if (newRelations.length > 0) {
      processedGroups++;
      allRelationsToCreate.push(...newRelations);

      // Добавляем в existingPairs чтобы не создавать дубликаты в пределах этого запуска
      for (const rel of newRelations) {
        existingPairs.add(`${rel.clientId}:${rel.relatedClientId}`);
      }
    }
  }

  console.log(`\nГрупп для обработки: ${processedGroups}`);
  console.log(`Связей для создания: ${allRelationsToCreate.length}`);

  // 5. Выводим статистику по типам
  const statsByType = new Map<RelationType, number>();
  for (const rel of allRelationsToCreate) {
    statsByType.set(rel.relationType, (statsByType.get(rel.relationType) || 0) + 1);
  }

  console.log('\nСтатистика по типам связей:');
  for (const [type, count] of statsByType) {
    console.log(`  ${type}: ${count}`);
  }

  // 6. Выводим примеры (первые 20)
  if (allRelationsToCreate.length > 0) {
    console.log('\n=== Примеры связей (первые 20) ===\n');
    for (const rel of allRelationsToCreate.slice(0, 20)) {
      console.log(rel.description);
    }

    if (allRelationsToCreate.length > 20) {
      console.log(`\n... и ещё ${allRelationsToCreate.length - 20} связей`);
    }
  }

  // 7. Создаём связи (если не dry-run)
  if (!DRY_RUN && allRelationsToCreate.length > 0) {
    console.log('\n=== Создание связей в базе данных ===');

    const result = await prisma.clientRelation.createMany({
      data: allRelationsToCreate.map((rel) => ({
        clientId: rel.clientId,
        relatedClientId: rel.relatedClientId,
        relationType: rel.relationType,
      })),
      skipDuplicates: true,
    });

    console.log(`Создано связей: ${result.count}`);
  } else if (DRY_RUN) {
    console.log('\n[DRY-RUN] Связи не создаются. Запустите без --dry-run для реального выполнения.');
  }
}

linkClientsByPhone()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
