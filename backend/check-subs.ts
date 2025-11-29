import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Все подписки клиента Никита Мальцев
  const subscriptions = await prisma.subscription.findMany({
    where: { clientId: 'c7d315f1-e104-4aec-8873-41d94a2fb536' },
    include: {
      group: true,
      subscriptionType: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('=== ВСЕ ПОДПИСКИ КЛИЕНТА (последние 10) ===\n');
  subscriptions.forEach((sub, idx) => {
    console.log('[' + (idx + 1) + '] ' + (sub.subscriptionType?.name || 'Без типа'));
    console.log('  ID:', sub.id);
    console.log('  Группа:', sub.group?.name);
    console.log('  Тип:', sub.subscriptionType?.type);
    console.log('  Статус:', sub.status);
    console.log('  Осталось посещений:', sub.remainingVisits);
    console.log('  Создано:', sub.createdAt);
    console.log('');
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
