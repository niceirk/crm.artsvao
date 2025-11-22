import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultTemplates = [
  {
    eventType: 'SCHEDULE_REMINDER',
    templateText: `Здравствуйте, {{clientName}}! 👋

Напоминаем, что у вас запланировано занятие:

📅 Дата: {{scheduleDate}}
🕐 Время: {{scheduleTime}}
⏱ Длительность: {{duration}}
👥 Группа: {{groupName}}
🏢 Зал: {{roomName}}

Ждем вас! Если не сможете прийти, пожалуйста, предупредите нас заранее.`,
    isActive: true,
  },
  {
    eventType: 'SUBSCRIPTION_PURCHASED',
    templateText: `Поздравляем, {{clientName}}! 🎉

Ваш абонемент успешно оформлен:

📋 Тип: {{subscriptionType}}
👥 Группа: {{groupName}}
📅 Период: с {{startDate}} по {{endDate}}
🎟 Количество занятий: {{sessionsTotal}}

Спасибо за доверие! Ждем вас на занятиях.`,
    isActive: true,
  },
  {
    eventType: 'SCHEDULE_CHANGED',
    templateText: `Уважаемый {{clientName}}!

Обратите внимание: в расписании произошли изменения.

Обновленная информация о занятии:
📅 Дата: {{scheduleDate}}
🕐 Время: {{scheduleTime}}
👥 Группа: {{groupName}}
🏢 Зал: {{roomName}}

Приносим извинения за возможные неудобства.`,
    isActive: true,
  },
  {
    eventType: 'PAYMENT_RECEIVED',
    templateText: `Здравствуйте, {{clientName}}! ✅

Ваш платеж успешно получен:

💰 Сумма: {{amount}} руб.
📅 Дата: {{paymentDate}}
💳 Способ оплаты: {{paymentMethod}}

Спасибо за оплату!`,
    isActive: true,
  },
];

async function seedNotificationTemplates() {
  console.log('Seeding notification templates...');

  for (const template of defaultTemplates) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: { eventType: template.eventType },
    });

    if (existing) {
      console.log(`Template for ${template.eventType} already exists, skipping...`);
      continue;
    }

    await prisma.notificationTemplate.create({
      data: template,
    });

    console.log(`Created template: ${template.eventType}`);
  }

  console.log('Notification templates seeding completed!');
}

seedNotificationTemplates()
  .catch((error) => {
    console.error('Error seeding notification templates:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
