import { Module } from '@nestjs/common';
import { BenefitCategoriesService } from './benefit-categories.service';
import { BenefitCategoriesController } from './benefit-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BenefitCategoriesController],
  providers: [BenefitCategoriesService],
  exports: [BenefitCategoriesService],
})
export class BenefitCategoriesModule {}
