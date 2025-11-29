import { PrismaClient, RelationType } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

interface ClientInfo {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  dateOfBirth: Date | null;
}

interface RelationToFix {
  id: string;
  currentType: RelationType;
  newType: RelationType;
  reason: string;
  client1: string;
  client2: string;
}

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

function formatClient(client: ClientInfo): string {
  const age = getAge(client.dateOfBirth);
  const ageStr = age !== null ? `${age} лет` : 'нет даты';
  const fullName = [client.lastName, client.firstName].filter(Boolean).join(' ');
  return `${fullName} (${ageStr})`;
}

async function fixRelations() {
  console.log('=== Исправление родственных связей ===');
  console.log(`Режим: ${DRY_RUN ? 'DRY-RUN (без изменений)' : 'РЕАЛЬНОЕ ВЫПОЛНЕНИЕ'}\n`);

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

  const toFix: RelationToFix[] = [];

  for (const relation of relations) {
    const { client, relatedClient, relationType } = relation;
    const age1 = getAge(client.dateOfBirth);
    const age2 = getAge(relatedClient.dateOfBirth);

    // Проверяем PARENT - "родитель" должен быть старше
    if (relationType === RelationType.PARENT) {
      // relatedClient должен быть старше client
      if (age1 !== null && age2 !== null && age2 < age1) {
        toFix.push({
          id: relation.id,
          currentType: RelationType.PARENT,
          newType: RelationType.CHILD,
          reason: `PARENT→CHILD: "${relatedClient.firstName}" (${age2}) младше "${client.firstName}" (${age1})`,
          client1: formatClient(client),
          client2: formatClient(relatedClient),
        });
      }
    }

    // Проверяем CHILD - "ребёнок" должен быть младше
    if (relationType === RelationType.CHILD) {
      // relatedClient должен быть младше client
      if (age1 !== null && age2 !== null && age2 > age1) {
        toFix.push({
          id: relation.id,
          currentType: RelationType.CHILD,
          newType: RelationType.PARENT,
          reason: `CHILD→PARENT: "${relatedClient.firstName}" (${age2}) старше "${client.firstName}" (${age1})`,
          client1: formatClient(client),
          client2: formatClient(relatedClient),
        });
      }

      // Проверяем слишком маленькую разницу в возрасте
      if (age1 !== null && age2 !== null) {
        const diff = Math.abs(age1 - age2);
        if (diff < 15) {
          toFix.push({
            id: relation.id,
            currentType: RelationType.CHILD,
            newType: RelationType.SIBLING,
            reason: `CHILD→SIBLING: разница всего ${diff} лет`,
            client1: formatClient(client),
            client2: formatClient(relatedClient),
          });
        }
      }
    }
  }

  // Убираем дубликаты (одна связь может попасть дважды)
  const uniqueToFix = new Map<string, RelationToFix>();
  for (const fix of toFix) {
    if (!uniqueToFix.has(fix.id)) {
      uniqueToFix.set(fix.id, fix);
    }
  }

  const fixList = Array.from(uniqueToFix.values());

  console.log(`Связей для исправления: ${fixList.length}\n`);

  // Статистика по типам изменений
  const stats = new Map<string, number>();
  for (const fix of fixList) {
    const key = `${fix.currentType} → ${fix.newType}`;
    stats.set(key, (stats.get(key) || 0) + 1);
  }

  console.log('Изменения:');
  for (const [change, count] of stats) {
    console.log(`  ${change}: ${count}`);
  }

  // Выводим примеры (первые 20)
  if (fixList.length > 0) {
    console.log('\n=== Примеры исправлений (первые 20) ===\n');
    for (const fix of fixList.slice(0, 20)) {
      console.log(`${fix.reason}`);
      console.log(`  ${fix.client1} → ${fix.client2}`);
      console.log('');
    }

    if (fixList.length > 20) {
      console.log(`... и ещё ${fixList.length - 20} исправлений`);
    }
  }

  // Применяем исправления
  if (!DRY_RUN && fixList.length > 0) {
    console.log('\n=== Применение исправлений ===\n');

    let fixed = 0;
    for (const fix of fixList) {
      await prisma.clientRelation.update({
        where: { id: fix.id },
        data: { relationType: fix.newType },
      });
      fixed++;

      if (fixed % 100 === 0) {
        console.log(`Исправлено: ${fixed}/${fixList.length}`);
      }
    }

    console.log(`\nВсего исправлено: ${fixed} связей`);
  } else if (DRY_RUN) {
    console.log('\n[DRY-RUN] Изменения не применяются. Запустите без --dry-run для исправления.');
  }
}

fixRelations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
