import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Найти клиента Мальцев Никита
  const client = await prisma.client.findFirst({
    where: {
      lastName: { contains: 'Мальцев', mode: 'insensitive' },
      firstName: { contains: 'Никита', mode: 'insensitive' }
    }
  });

  if (!client) {
    console.log('Клиент не найден');
    return;
  }

  console.log('=== КЛИЕНТ ===');
  console.log('ID:', client.id);
  console.log('ФИО:', client.lastName, client.firstName, client.middleName || '');

  // Найти абонементы клиента активные в ноябре 2024
  const subscriptions = await prisma.subscription.findMany({
    where: {
      clientId: client.id,
      startDate: { lte: new Date('2024-11-23') },
      endDate: { gte: new Date('2024-11-17') }
    },
    include: {
      subscriptionType: true,
      group: {
        include: { studio: true }
      }
    }
  });

  console.log('\n=== АБОНЕМЕНТЫ ===');
  for (const sub of subscriptions) {
    console.log('---');
    console.log('ID:', sub.id);
    console.log('Тип:', sub.subscriptionType.name, '(' + sub.subscriptionType.type + ')');
    console.log('Группа:', sub.group?.name);
    console.log('Период:', sub.startDate.toISOString().split('T')[0], '-', sub.endDate.toISOString().split('T')[0]);
    console.log('validMonth:', sub.validMonth);
    console.log('paidPrice:', Number(sub.paidPrice));
    console.log('pricePerLesson:', sub.pricePerLesson ? Number(sub.pricePerLesson) : 'null');
    console.log('status:', sub.status);

    // Посчитать количество занятий в группе за месяц validMonth
    const [year, month] = sub.validMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const schedulesInMonth = await prisma.schedule.count({
      where: {
        groupId: sub.groupId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        status: { not: 'CANCELLED' }
      }
    });

    console.log('Занятий в группе за', sub.validMonth + ':', schedulesInMonth);

    if (schedulesInMonth > 0) {
      const calculatedPricePerLesson = Math.round(Number(sub.paidPrice) / schedulesInMonth);
      console.log('Расчётная цена за занятие:', calculatedPricePerLesson, '=', Number(sub.paidPrice), '/', schedulesInMonth);
    }
  }

  // Найти справку за 17-23 ноября
  const certificate = await prisma.medicalCertificate.findFirst({
    where: {
      clientId: client.id,
      startDate: new Date('2024-11-17'),
      endDate: new Date('2024-11-23')
    },
    include: {
      appliedSchedules: {
        include: {
          schedule: {
            include: {
              group: true
            }
          }
        }
      }
    }
  });

  if (certificate) {
    console.log('\n=== СПРАВКА ===');
    console.log('ID:', certificate.id);
    console.log('Период:', certificate.startDate.toISOString().split('T')[0], '-', certificate.endDate.toISOString().split('T')[0]);
    console.log('Применённые занятия:', certificate.appliedSchedules.length);

    let totalCompensation = 0;
    for (const applied of certificate.appliedSchedules) {
      console.log('---');
      console.log('Занятие:', applied.schedule.date.toISOString().split('T')[0]);
      console.log('Группа:', applied.schedule.group?.name);
      console.log('compensationAmount:', applied.compensationAmount ? Number(applied.compensationAmount) : 'null');
      console.log('subscriptionId:', applied.subscriptionId);
      if (applied.compensationAmount) {
        totalCompensation += Number(applied.compensationAmount);
      }
    }
    console.log('\nОБЩАЯ КОМПЕНСАЦИЯ:', totalCompensation);
  } else {
    console.log('\nСправка не найдена, проверяем занятия в период 17-23 ноября...');

    // Найти занятия клиента за период
    const groupMembers = await prisma.groupMember.findMany({
      where: { clientId: client.id, status: 'ACTIVE' },
      select: { groupId: true }
    });

    const groupIds = groupMembers.map(gm => gm.groupId);

    // Добавляем группы из абонементов
    for (const sub of subscriptions) {
      if (sub.groupId && !groupIds.includes(sub.groupId)) {
        groupIds.push(sub.groupId);
      }
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        groupId: { in: groupIds },
        date: {
          gte: new Date('2024-11-17'),
          lte: new Date('2024-11-23')
        },
        status: { not: 'CANCELLED' }
      },
      include: {
        group: true
      },
      orderBy: { date: 'asc' }
    });

    console.log('\n=== ЗАНЯТИЯ ЗА ПЕРИОД ===');
    for (const schedule of schedules) {
      console.log('---');
      console.log('Дата:', schedule.date.toISOString().split('T')[0]);
      console.log('Группа:', schedule.group?.name);
      console.log('groupId:', schedule.groupId);

      // Найти подходящий абонемент
      const matchingSub = subscriptions.find(sub =>
        sub.groupId === schedule.groupId &&
        new Date(sub.startDate) <= schedule.date &&
        new Date(sub.endDate) >= schedule.date
      );

      if (matchingSub) {
        console.log('Абонемент:', matchingSub.subscriptionType.name);
        console.log('paidPrice:', Number(matchingSub.paidPrice));

        // Посчитать занятия в месяце
        const [year, month] = matchingSub.validMonth.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const schedulesInMonth = await prisma.schedule.count({
          where: {
            groupId: matchingSub.groupId,
            date: { gte: startOfMonth, lte: endOfMonth },
            status: { not: 'CANCELLED' }
          }
        });

        const pricePerLesson = Math.round(Number(matchingSub.paidPrice) / schedulesInMonth);
        console.log('Занятий в месяце:', schedulesInMonth);
        console.log('Компенсация за занятие:', pricePerLesson, '=', Number(matchingSub.paidPrice), '/', schedulesInMonth);
      } else {
        console.log('Абонемент: НЕ НАЙДЕН');
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
