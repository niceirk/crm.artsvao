import { Module } from '@nestjs/common';
import { PublicWidgetController } from './public-widget.controller';
import { PublicWidgetService } from './public-widget.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TimepadModule } from '../integrations/timepad/timepad.module';

@Module({
  imports: [PrismaModule, TimepadModule],
  controllers: [PublicWidgetController],
  providers: [PublicWidgetService],
})
export class PublicWidgetModule {}
