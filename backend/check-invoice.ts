import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: 'd90e1861-369b-4152-bd2a-f1214a2d9854' },
    include: {
      items: true,
      client: true,
    },
  });

  if (!invoice) {
    console.log('Счёт не найден');
    return;
  }

  console.log('=== СЧЁТ ===');
  console.log('ID:', invoice.id);
  console.log('Номер:', invoice.invoiceNumber);
  console.log('Статус:', invoice.status);
  console.log('Клиент:', invoice.client?.firstName, invoice.client?.lastName);
  console.log('ClientId:', invoice.clientId);
  console.log('\n=== ПОЗИЦИИ ===');
  invoice.items.forEach((item, idx) => {
    console.log('\n[' + (idx + 1) + '] ' + item.serviceName);
    console.log('  serviceId:', item.serviceId);
    console.log('  groupId:', item.groupId);
    console.log('  serviceType:', item.serviceType);
  });

  // Проверим подписки клиента
  const subscriptions = await prisma.subscription.findMany({
    where: { clientId: invoice.clientId },
    include: { group: true, subscriptionType: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('\n=== ПОДПИСКИ КЛИЕНТА (последние 5) ===');
  if (subscriptions.length === 0) {
    console.log('Подписок нет');
  } else {
    subscriptions.forEach((sub, idx) => {
      console.log('\n[' + (idx + 1) + '] ' + (sub.subscriptionType?.name || 'Без типа'));
      console.log('  Группа:', sub.group?.name);
      console.log('  Статус:', sub.status);
      console.log('  Создано:', sub.createdAt);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
