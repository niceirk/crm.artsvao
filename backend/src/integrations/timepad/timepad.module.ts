import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TimepadService } from './timepad.service';
import { TimepadController } from './timepad.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [TimepadController],
  providers: [TimepadService],
  exports: [TimepadService],
})
export class TimepadModule {}
