import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ClientsModule } from './clients/clients.module';
import { ClientRelationsModule } from './client-relations/client-relations.module';
import { LeadSourcesModule } from './lead-sources/lead-sources.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { RoomsModule } from './rooms/rooms.module';
import { TeachersModule } from './teachers/teachers.module';
import { StudiosModule } from './studios/studios.module';
import { GroupsModule } from './groups/groups.module';
import { SchedulesModule } from './schedules/schedules.module';
import { RentalsModule } from './rentals/rentals.module';
import { EventTypesModule } from './event-types/event-types.module';
import { EventsModule } from './events/events.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    ClientRelationsModule,
    LeadSourcesModule,
    AuditLogModule,
    RoomsModule,
    TeachersModule,
    StudiosModule,
    GroupsModule,
    SchedulesModule,
    RentalsModule,
    EventTypesModule,
    EventsModule,
    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Apply JWT guard globally
    },
  ],
})
export class AppModule {}
