import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearClients() {
  console.log('🗑️  Очистка таблицы clients и связанных данных...\n');

  try {
    // Удаляем связанные записи в правильном порядке
    console.log('   1. Удаление платежей...');
    const payments = await prisma.payment.deleteMany({});
    console.log(`      ✓ Удалено платежей: ${payments.count}`);

    console.log('   2. Удаление абонементов...');
    const subscriptions = await prisma.subscription.deleteMany({});
    console.log(`      ✓ Удалено абонементов: ${subscriptions.count}`);

    console.log('   3. Удаление счетов...');
    const invoices = await prisma.invoice.deleteMany({});
    console.log(`      ✓ Удалено счетов: ${invoices.count}`);

    console.log('   4. Удаление посещаемости...');
    const attendances = await prisma.attendance.deleteMany({});
    console.log(`      ✓ Удалено записей посещаемости: ${attendances.count}`);

    console.log('   5. Удаление аренды...');
    const rentals = await prisma.rental.deleteMany({});
    console.log(`      ✓ Удалено записей аренды: ${rentals.count}`);

    console.log('   6. Удаление заметок...');
    const notes = await prisma.clientNote.deleteMany({});
    console.log(`      ✓ Удалено заметок: ${notes.count}`);

    console.log('   7. Удаление документов...');
    const documents = await prisma.clientDocument.deleteMany({});
    console.log(`      ✓ Удалено документов: ${documents.count}`);

    console.log('   8. Удаление связей клиентов...');
    const relations = await prisma.clientRelation.deleteMany({});
    console.log(`      ✓ Удалено связей: ${relations.count}`);

    console.log('   9. Удаление клиентов...');
    const clients = await prisma.client.deleteMany({});
    console.log(`      ✓ Удалено клиентов: ${clients.count}`);

    console.log('\n✅ Очистка завершена успешно!\n');
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearClients().catch(console.error);
