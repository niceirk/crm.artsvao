import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ClientsModule } from './clients/clients.module';
import { ClientRelationsModule } from './client-relations/client-relations.module';
import { ClientNotesModule } from './client-notes/client-notes.module';
import { ClientDocumentsModule } from './client-documents/client-documents.module';
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
import { BenefitCategoriesModule } from './benefit-categories/benefit-categories.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { ServicesModule } from './services/services.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SubscriptionTypesModule } from './subscription-types/subscription-types.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentsModule } from './payments/payments.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthModule } from './health/health.module';
import { PyrusModule } from './integrations/pyrus/pyrus.module';
import { NovofonModule } from './integrations/novofon/novofon.module';
import { EmailModule } from './email/email.module';
import { TelegramModule } from './telegram/telegram.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UnifiedNotificationsModule } from './unified-notifications/unified-notifications.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { ArchivedSalesModule } from './archived-sales/archived-sales.module';
import { NomenclatureModule } from './nomenclature/nomenclature.module';
import { MedicalCertificatesModule } from './medical-certificates/medical-certificates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    // Rate limiting: 100 запросов за 60 секунд с одного IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 секунд
        limit: 100, // максимум 100 запросов
      },
    ]),
    PrismaModule,
    EmailModule,
    TelegramModule,
    MessagesModule,
    NotificationsModule,
    UnifiedNotificationsModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    ClientRelationsModule,
    ClientNotesModule,
    ClientDocumentsModule,
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
    BenefitCategoriesModule,
    ServiceCategoriesModule,
    ServicesModule,
    InvoicesModule,
    SubscriptionTypesModule,
    SubscriptionsModule,
    AttendanceModule,
    PaymentsModule,
    CalendarModule,
    HealthModule,
    PyrusModule,
    NovofonModule,
    TimesheetsModule,
    ArchivedSalesModule,
    NomenclatureModule,
    MedicalCertificatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Apply rate limiting globally
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Apply JWT guard globally
    },
  ],
})
export class AppModule {}
