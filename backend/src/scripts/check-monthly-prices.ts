import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.rentalApplication.findMany({
    where: { rentalType: 'ROOM_MONTHLY' },
    select: {
      id: true,
      applicationNumber: true,
      rentalType: true,
      periodType: true,
      startDate: true,
      endDate: true,
      basePrice: true,
      quantity: true,
      totalPrice: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  
  console.log('=== ROOM_MONTHLY applications ===\n');
  const needsFix: string[] = [];
  
  for (const app of apps) {
    const start = new Date(app.startDate);
    const end = app.endDate ? new Date(app.endDate) : start;
    
    let correctQty: number;
    if (app.periodType === 'SLIDING_MONTH') {
      correctQty = 1;
    } else {
      correctQty = (end.getFullYear() - start.getFullYear()) * 12 + 
                   (end.getMonth() - start.getMonth()) + 1;
    }
    
    const correctTotal = Number(app.basePrice) * correctQty;
    const isWrong = Math.abs(Number(app.totalPrice) - correctTotal) > 0.01;
    
    if (isWrong) {
      needsFix.push(app.id);
    }
    
    console.log({
      number: app.applicationNumber,
      periodType: app.periodType,
      dates: app.startDate.toISOString().split('T')[0] + ' - ' + (app.endDate?.toISOString().split('T')[0] || 'null'),
      basePrice: Number(app.basePrice),
      currentTotal: Number(app.totalPrice),
      correctTotal,
      needsFix: isWrong ? '⚠️  YES' : '✓',
    });
  }
  
  console.log('\n=== Summary ===');
  console.log('Total ROOM_MONTHLY:', apps.length);
  console.log('Needing fix:', needsFix.length);
  if (needsFix.length > 0) {
    console.log('IDs to fix:', needsFix);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
