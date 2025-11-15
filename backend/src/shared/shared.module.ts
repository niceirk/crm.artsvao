import { Module } from '@nestjs/common';
import { ConflictCheckerService } from './conflict-checker.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ConflictCheckerService],
  exports: [ConflictCheckerService],
})
export class SharedModule {}
