import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PyrusService } from './pyrus.service';
import { PyrusController } from './pyrus.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../../events/events.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    PrismaModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [PyrusController],
  providers: [PyrusService],
  exports: [PyrusService],
})
export class PyrusModule {}
