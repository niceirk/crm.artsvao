import { PrismaClient, RentalPeriodType } from '@prisma/client';

const prisma = new PrismaClient();

function calculateMonthsCount(periodType: RentalPeriodType, startDate: Date, endDate: Date | null): number {
  if (!endDate) return 1;
  
  if (periodType === 'SLIDING_MONTH') {
    return 1;
  }
  
  // Календарные месяцы
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
         (endDate.getMonth() - startDate.getMonth()) + 1;
}

async function main() {
  const apps = await prisma.rentalApplication.findMany({
    where: { rentalType: 'ROOM_MONTHLY' },
  });
  
  console.log('=== Fixing ROOM_MONTHLY applications ===\n');
  
  let fixedCount = 0;
  
  for (const app of apps) {
    const correctQty = calculateMonthsCount(app.periodType, app.startDate, app.endDate);
    const correctTotal = Number(app.basePrice) * correctQty;
    const currentTotal = Number(app.totalPrice);
    
    if (Math.abs(currentTotal - correctTotal) > 0.01) {
      console.log(`Fixing ${app.applicationNumber}:`);
      console.log(`  Current: ${currentTotal}, Correct: ${correctTotal}`);
      console.log(`  basePrice: ${app.basePrice}, correctQty: ${correctQty}`);
      
      await prisma.rentalApplication.update({
        where: { id: app.id },
        data: {
          quantity: correctQty,
          totalPrice: correctTotal,
        },
      });
      
      console.log(`  ✓ Fixed!\n`);
      fixedCount++;
    }
  }
  
  console.log(`\n=== Done ===`);
  console.log(`Fixed ${fixedCount} applications`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
