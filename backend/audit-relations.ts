import { PrismaClient, RelationType } from '@prisma/client';

const prisma = new PrismaClient();

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: Date | null;
}

interface RelationWithClients {
  id: string;
  clientId: string;
  relatedClientId: string;
  relationType: RelationType;
  client: ClientInfo;
  relatedClient: ClientInfo;
}

interface Issue {
  relationId: string;
  type: 'ERROR' | 'WARNING';
  category: string;
  message: string;
  client1: string;
  client2: string;
  relationType: RelationType;
  suggestedType?: RelationType;
}

// =============== Вспомогательные функции ===============

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

function isAdult(dateOfBirth: Date | null): boolean {
  const age = getAge(dateOfBirth);
  return age !== null && age >= 18;
}

function nameToPatronymic(firstName: string): { male: string; female: string } {
  const name = firstName.trim().toLowerCase();

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

  let stem = firstName;
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

  return { male: firstName + 'ович', female: firstName + 'овна' };
}

function isPatronymicFromName(patronymic: string | null, fatherName: string): boolean {
  if (!patronymic || !fatherName) return false;
  const expected = nameToPatronymic(fatherName);
  const normalizedPatronymic = patronymic.trim().toLowerCase();
  return (
    normalizedPatronymic === expected.male.toLowerCase() ||
    normalizedPatronymic === expected.female.toLowerCase()
  );
}

function sameFamilyName(lastName1: string, lastName2: string): boolean {
  const normalize = (name: string) => {
    const n = name.trim().toLowerCase();
    if (n.endsWith('ова')) return n.slice(0, -1);
    if (n.endsWith('ева')) return n.slice(0, -1);
    if (n.endsWith('ина')) return n.slice(0, -1);
    if (n.endsWith('ая')) return n.slice(0, -2) + 'ий';
    return n;
  };
  return normalize(lastName1) === normalize(lastName2);
}

function formatClient(client: ClientInfo): string {
  const age = getAge(client.dateOfBirth);
  const ageStr = age !== null ? `${age} лет` : 'нет даты';
  const fullName = [client.lastName, client.firstName, client.middleName].filter(Boolean).join(' ');
  return `${fullName} (${ageStr})`;
}

function ageDifference(client1: ClientInfo, client2: ClientInfo): number | null {
  const age1 = getAge(client1.dateOfBirth);
  const age2 = getAge(client2.dateOfBirth);
  if (age1 === null || age2 === null) return null;
  return Math.abs(age1 - age2);
}

function isOlder(client1: ClientInfo, client2: ClientInfo): boolean {
  if (!client1.dateOfBirth || !client2.dateOfBirth) return false;
  return client1.dateOfBirth < client2.dateOfBirth;
}

// =============== Логика проверки ===============

function suggestRelationType(client: ClientInfo, relatedClient: ClientInfo): RelationType {
  const diff = ageDifference(client, relatedClient);
  const adult1 = isAdult(client.dateOfBirth);
  const adult2 = isAdult(relatedClient.dateOfBirth);
  const sameFamily = sameFamilyName(client.lastName, relatedClient.lastName);

  // Проверка отца по отчеству
  if (isPatronymicFromName(client.middleName, relatedClient.firstName)) {
    return RelationType.PARENT;
  }
  if (isPatronymicFromName(relatedClient.middleName, client.firstName)) {
    return RelationType.CHILD;
  }

  // Супруги
  if (adult1 && adult2 && diff !== null && diff < 20 && !sameFamily) {
    return RelationType.SPOUSE;
  }

  // Родитель/ребёнок
  if (diff !== null && diff >= 15) {
    return isOlder(client, relatedClient) ? RelationType.CHILD : RelationType.PARENT;
  }

  // Братья/сёстры
  if (diff !== null && diff < 15 && sameFamily) {
    return RelationType.SIBLING;
  }

  return RelationType.SIBLING;
}

function auditRelation(relation: RelationWithClients): Issue[] {
  const issues: Issue[] = [];
  const { client, relatedClient, relationType } = relation;

  const diff = ageDifference(client, relatedClient);
  const age1 = getAge(client.dateOfBirth);
  const age2 = getAge(relatedClient.dateOfBirth);
  const adult1 = isAdult(client.dateOfBirth);
  const adult2 = isAdult(relatedClient.dateOfBirth);
  const sameFamily = sameFamilyName(client.lastName, relatedClient.lastName);

  const client1Str = formatClient(client);
  const client2Str = formatClient(relatedClient);

  // Проверка PARENT
  if (relationType === RelationType.PARENT) {
    // "Родитель" должен быть старше минимум на 15 лет
    if (diff !== null && diff < 15) {
      issues.push({
        relationId: relation.id,
        type: 'ERROR',
        category: 'PARENT_AGE_TOO_CLOSE',
        message: `PARENT: разница всего ${diff} лет (нужно >= 15)`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.SIBLING,
      });
    }

    // Проверяем что relatedClient действительно старше
    if (age1 !== null && age2 !== null && age2 < age1) {
      issues.push({
        relationId: relation.id,
        type: 'ERROR',
        category: 'PARENT_YOUNGER',
        message: `PARENT: "родитель" ${relatedClient.firstName} (${age2}) младше "ребёнка" ${client.firstName} (${age1})`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.CHILD,
      });
    }
  }

  // Проверка CHILD
  if (relationType === RelationType.CHILD) {
    // "Ребёнок" должен быть младше минимум на 15 лет
    if (diff !== null && diff < 15) {
      issues.push({
        relationId: relation.id,
        type: 'ERROR',
        category: 'CHILD_AGE_TOO_CLOSE',
        message: `CHILD: разница всего ${diff} лет (нужно >= 15)`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.SIBLING,
      });
    }

    // Проверяем что relatedClient действительно младше
    if (age1 !== null && age2 !== null && age2 > age1) {
      issues.push({
        relationId: relation.id,
        type: 'ERROR',
        category: 'CHILD_OLDER',
        message: `CHILD: "ребёнок" ${relatedClient.firstName} (${age2}) старше "родителя" ${client.firstName} (${age1})`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.PARENT,
      });
    }
  }

  // Проверка SPOUSE
  if (relationType === RelationType.SPOUSE) {
    // Оба должны быть взрослыми
    if (!adult1 || !adult2) {
      const minor = !adult1 ? client.firstName : relatedClient.firstName;
      const minorAge = !adult1 ? age1 : age2;
      issues.push({
        relationId: relation.id,
        type: 'ERROR',
        category: 'SPOUSE_MINOR',
        message: `SPOUSE: ${minor} (${minorAge} лет) несовершеннолетний`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.CHILD,
      });
    }

    // Большая разница в возрасте подозрительна
    if (diff !== null && diff > 30) {
      issues.push({
        relationId: relation.id,
        type: 'WARNING',
        category: 'SPOUSE_AGE_GAP',
        message: `SPOUSE: большая разница в возрасте (${diff} лет)`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.PARENT,
      });
    }
  }

  // Проверка SIBLING
  if (relationType === RelationType.SIBLING) {
    // Большая разница в возрасте подозрительна для братьев/сестёр
    if (diff !== null && diff >= 20) {
      issues.push({
        relationId: relation.id,
        type: 'WARNING',
        category: 'SIBLING_AGE_GAP',
        message: `SIBLING: большая разница в возрасте (${diff} лет)`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: suggestRelationType(client, relatedClient),
      });
    }
  }

  // Проверка отчества - если у ребёнка отчество от имени взрослого, но связь не PARENT/CHILD
  if (relationType !== RelationType.PARENT && relationType !== RelationType.CHILD) {
    if (isPatronymicFromName(client.middleName, relatedClient.firstName)) {
      issues.push({
        relationId: relation.id,
        type: 'WARNING',
        category: 'PATRONYMIC_MISMATCH',
        message: `Отчество "${client.middleName}" указывает что ${relatedClient.firstName} - отец, но связь: ${relationType}`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.PARENT,
      });
    }
    if (isPatronymicFromName(relatedClient.middleName, client.firstName)) {
      issues.push({
        relationId: relation.id,
        type: 'WARNING',
        category: 'PATRONYMIC_MISMATCH',
        message: `Отчество "${relatedClient.middleName}" указывает что ${client.firstName} - отец, но связь: ${relationType}`,
        client1: client1Str,
        client2: client2Str,
        relationType,
        suggestedType: RelationType.CHILD,
      });
    }
  }

  return issues;
}

// =============== Main ===============

async function auditRelations() {
  console.log('=== Аудит родственных связей ===\n');

  // Загружаем все связи с данными клиентов
  const relations = await prisma.clientRelation.findMany({
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
        },
      },
      relatedClient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          dateOfBirth: true,
        },
      },
    },
  });

  console.log(`Всего связей: ${relations.length}\n`);

  // Проверяем каждую связь
  const allIssues: Issue[] = [];
  for (const relation of relations) {
    const issues = auditRelation(relation as RelationWithClients);
    allIssues.push(...issues);
  }

  // Статистика по типам проблем
  const errorCount = allIssues.filter((i) => i.type === 'ERROR').length;
  const warningCount = allIssues.filter((i) => i.type === 'WARNING').length;

  console.log(`Найдено проблем: ${allIssues.length}`);
  console.log(`  - Ошибок (ERROR): ${errorCount}`);
  console.log(`  - Предупреждений (WARNING): ${warningCount}`);

  // Группируем по категориям
  const byCategory = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    if (!byCategory.has(issue.category)) {
      byCategory.set(issue.category, []);
    }
    byCategory.get(issue.category)!.push(issue);
  }

  console.log('\nПо категориям:');
  for (const [category, issues] of byCategory) {
    console.log(`  ${category}: ${issues.length}`);
  }

  // Выводим все ошибки
  if (errorCount > 0) {
    console.log('\n=== ОШИБКИ ===\n');
    const errors = allIssues.filter((i) => i.type === 'ERROR');
    for (const issue of errors) {
      console.log(`[${issue.category}] ${issue.message}`);
      console.log(`  ${issue.client1}`);
      console.log(`  → ${issue.client2}`);
      console.log(`  Текущая связь: ${issue.relationType}`);
      if (issue.suggestedType && issue.suggestedType !== issue.relationType) {
        console.log(`  Рекомендуемая: ${issue.suggestedType}`);
      }
      console.log(`  ID связи: ${issue.relationId}`);
      console.log('');
    }
  }

  // Выводим предупреждения (первые 30)
  if (warningCount > 0) {
    console.log('\n=== ПРЕДУПРЕЖДЕНИЯ (первые 30) ===\n');
    const warnings = allIssues.filter((i) => i.type === 'WARNING').slice(0, 30);
    for (const issue of warnings) {
      console.log(`[${issue.category}] ${issue.message}`);
      console.log(`  ${issue.client1}`);
      console.log(`  → ${issue.client2}`);
      console.log(`  Текущая связь: ${issue.relationType}`);
      if (issue.suggestedType && issue.suggestedType !== issue.relationType) {
        console.log(`  Рекомендуемая: ${issue.suggestedType}`);
      }
      console.log('');
    }

    if (warningCount > 30) {
      console.log(`... и ещё ${warningCount - 30} предупреждений`);
    }
  }

  if (allIssues.length === 0) {
    console.log('\nВсе связи корректны!');
  }
}

auditRelations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
