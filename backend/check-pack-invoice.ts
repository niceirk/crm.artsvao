import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findUnique({
    where: { id: 'd90e1861-369b-4152-bd2a-f1214a2d9854' },
    include: {
      items: true,
      client: true,
      subscription: {
        include: {
          group: true,
          subscriptionType: true,
        },
      },
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
  console.log('SubscriptionId:', invoice.subscriptionId);

  console.log('\n=== ПОЗИЦИИ ===');
  invoice.items.forEach((item, idx) => {
    console.log('\n[' + (idx + 1) + '] ' + item.serviceName);
    console.log('  serviceId:', item.serviceId);
    console.log('  groupId:', item.groupId);
    console.log('  serviceType:', item.serviceType);
    console.log('  quantity:', item.quantity);
  });

  if (invoice.subscription) {
    console.log('\n=== СВЯЗАННАЯ ПОДПИСКА ===');
    console.log('ID:', invoice.subscription.id);
    console.log('Тип:', invoice.subscription.subscriptionType?.name);
    console.log('Группа:', invoice.subscription.group?.name);
    console.log('Статус:', invoice.subscription.status);
    console.log('Осталось:', invoice.subscription.remainingVisits);
    console.log('Всего:', invoice.subscription.totalVisits);
  } else {
    console.log('\n=== СВЯЗАННАЯ ПОДПИСКА: ОТСУТСТВУЕТ ===');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
