import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const clientId = '941dbe31-ae7d-4e20-912a-cd0edc67416f';

  // Найти все абонементы клиента
  const allSubs = await prisma.subscription.findMany({
    where: { clientId },
    include: { subscriptionType: true, group: true }
  });

  console.log('=== ВСЕ АБОНЕМЕНТЫ КЛИЕНТА ===');
  for (const s of allSubs) {
    console.log('---');
    console.log('Тип:', s.subscriptionType?.name);
    console.log('Группа:', s.group?.name, '(ID:', s.groupId + ')');
    console.log('purchaseDate:', s.purchaseDate?.toISOString().split('T')[0]);
    console.log('validMonth:', s.validMonth);
    console.log('paidPrice:', Number(s.paidPrice));
    console.log('pricePerLesson:', s.pricePerLesson ? Number(s.pricePerLesson) : 'null');
  }

  // Найти группу Тхэквондо 7-10 лет
  const group = await prisma.group.findFirst({
    where: { name: { contains: 'Тхэквондо, 7-10' } }
  });

  console.log('\n=== ГРУППА Тхэквондо 7-10 лет ===');
  console.log('ID:', group?.id);
  console.log('Name:', group?.name);

  if (group) {
    // Занятия группы за ноябрь
    const schedules = await prisma.schedule.findMany({
      where: {
        groupId: group.id,
        date: {
          gte: new Date('2025-11-01'),
          lte: new Date('2025-11-30')
        },
        status: { not: 'CANCELLED' }
      },
      orderBy: { date: 'asc' }
    });

    console.log('\nЗанятий в ноябре:', schedules.length);
    for (const s of schedules) {
      console.log(' ', s.date.toISOString().split('T')[0]);
    }

    // Абонемент клиента на эту группу
    const subForGroup = allSubs.find(s => s.groupId === group.id);
    if (subForGroup) {
      console.log('\n=== АБОНЕМЕНТ НА ЭТУ ГРУППУ ===');
      console.log('paidPrice:', Number(subForGroup.paidPrice));
      console.log('pricePerLesson:', subForGroup.pricePerLesson ? Number(subForGroup.pricePerLesson) : 'null');
      console.log('validMonth:', subForGroup.validMonth);

      // Занятия в периоде справки 17-23 ноября
      const schedulesInPeriod = schedules.filter(s => {
        const d = new Date(s.date);
        return d >= new Date('2025-11-17') && d <= new Date('2025-11-23');
      });

      console.log('\nЗанятий в периоде 17-23 ноября:', schedulesInPeriod.length);
      for (const s of schedulesInPeriod) {
        console.log(' ', s.date.toISOString().split('T')[0]);
      }

      console.log('\n=== РАСЧЁТ КОМПЕНСАЦИИ ===');

      if (subForGroup.pricePerLesson) {
        console.log('Используется pricePerLesson из БД:', Number(subForGroup.pricePerLesson));
      } else {
        // Логика из previewSchedules:
        // schedulesCountByGroupMonth считается по занятиям из ПЕРИОДА СПРАВКИ
        const countInPeriod = schedulesInPeriod.length;
        const countAllMonth = schedules.length;

        console.log('По ВСЕМ занятиям месяца:', Number(subForGroup.paidPrice), '/', countAllMonth, '=', Math.round(Number(subForGroup.paidPrice) / countAllMonth));
        console.log('По занятиям ПЕРИОДА СПРАВКИ:', Number(subForGroup.paidPrice), '/', countInPeriod, '=', Math.round(Number(subForGroup.paidPrice) / countInPeriod));
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
