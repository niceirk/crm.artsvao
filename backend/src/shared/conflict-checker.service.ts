import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConflictCheckParams {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  roomIds: string[]; // Array of room IDs to check
  teacherId?: string; // Optional teacher ID (only for schedules)
  excludeScheduleId?: string;
  excludeRentalId?: string;
  excludeEventId?: string;
  excludeReservationId?: string;
}

@Injectable()
export class ConflictCheckerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Универсальная проверка конфликтов для всех типов событий
   * Проверяет конфликты в Schedule, Rental, Event и Reservation таблицах
   */
  async checkConflicts(params: ConflictCheckParams): Promise<void> {
    const {
      date,
      startTime,
      endTime,
      roomIds,
      teacherId,
      excludeScheduleId,
      excludeRentalId,
      excludeEventId,
      excludeReservationId,
    } = params;

    const checkDate = new Date(date);

    // Проверяем конфликты для каждой комнаты
    for (const roomId of roomIds) {
      // 1. Проверка конфликтов с Schedules (занятиями)
      await this.checkScheduleConflicts(
        checkDate,
        startTime,
        endTime,
        roomId,
        excludeScheduleId,
      );

      // 2. Проверка конфликтов с Rentals (арендой)
      await this.checkRentalConflicts(
        checkDate,
        startTime,
        endTime,
        roomId,
        excludeRentalId,
      );

      // 3. Проверка конфликтов с Events (мероприятиями)
      await this.checkEventConflicts(
        checkDate,
        startTime,
        endTime,
        roomId,
        excludeEventId,
      );

      // 4. Проверка конфликтов с Reservations (резервами)
      await this.checkReservationConflicts(
        checkDate,
        startTime,
        endTime,
        roomId,
        excludeReservationId,
      );
    }

    // 5. Если указан преподаватель - проверяем конфликты по преподавателю
    if (teacherId) {
      await this.checkTeacherConflicts(
        checkDate,
        startTime,
        endTime,
        teacherId,
        excludeScheduleId,
      );
    }
  }

  /**
   * Проверка конфликтов с занятиями (Schedules)
   */
  private async checkScheduleConflicts(
    date: Date,
    startTime: string,
    endTime: string,
    roomId: string,
    excludeScheduleId?: string,
  ): Promise<void> {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        date,
        roomId,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        status: { not: 'CANCELLED' },
      },
      include: {
        group: { select: { name: true } },
      },
    });

    for (const schedule of schedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        const groupInfo = schedule.group
          ? ` (группа: ${schedule.group.name})`
          : ' (индивидуальное занятие)';
        throw new ConflictException(
          `Комната уже занята занятием в это время${groupInfo}: ${scheduleStart} - ${scheduleEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов с арендой (Rentals)
   */
  private async checkRentalConflicts(
    date: Date,
    startTime: string,
    endTime: string,
    roomId: string,
    excludeRentalId?: string,
  ): Promise<void> {
    const rentals = await this.prisma.rental.findMany({
      where: {
        date,
        roomId,
        id: excludeRentalId ? { not: excludeRentalId } : undefined,
        status: { not: 'CANCELLED' },
      },
    });

    for (const rental of rentals) {
      const rentalStart = this.extractTimeString(rental.startTime);
      const rentalEnd = this.extractTimeString(rental.endTime);

      if (this.checkTimeOverlap(startTime, endTime, rentalStart, rentalEnd)) {
        throw new ConflictException(
          `Комната уже сдана в аренду в это время: ${rentalStart} - ${rentalEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов с мероприятиями (Events)
   */
  private async checkEventConflicts(
    date: Date,
    startTime: string,
    endTime: string,
    roomId: string,
    excludeEventId?: string,
  ): Promise<void> {
    const events = await this.prisma.event.findMany({
      where: {
        date,
        roomId: roomId,
        id: excludeEventId ? { not: excludeEventId } : undefined,
        status: { not: 'CANCELLED' },
      },
      include: {
        eventType: { select: { name: true } },
      },
    });

    for (const event of events) {
      const eventStart = this.extractTimeString(event.startTime);
      const eventEnd = this.extractTimeString(event.endTime);

      if (this.checkTimeOverlap(startTime, endTime, eventStart, eventEnd)) {
        const eventInfo = event.eventType
          ? ` (${event.eventType.name})`
          : '';
        throw new ConflictException(
          `Комната уже занята мероприятием "${event.name}"${eventInfo} в это время: ${eventStart} - ${eventEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов с резервами (Reservations)
   */
  private async checkReservationConflicts(
    date: Date,
    startTime: string,
    endTime: string,
    roomId: string,
    excludeReservationId?: string,
  ): Promise<void> {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        date,
        roomId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: { not: 'CANCELLED' },
      },
    });

    for (const reservation of reservations) {
      const reservationStart = this.extractTimeString(reservation.startTime);
      const reservationEnd = this.extractTimeString(reservation.endTime);

      if (this.checkTimeOverlap(startTime, endTime, reservationStart, reservationEnd)) {
        throw new ConflictException(
          `Комната уже зарезервирована в это время: ${reservationStart} - ${reservationEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов преподавателя (только для занятий)
   */
  private async checkTeacherConflicts(
    date: Date,
    startTime: string,
    endTime: string,
    teacherId: string,
    excludeScheduleId?: string,
  ): Promise<void> {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        date,
        teacherId,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        status: { not: 'CANCELLED' },
      },
      include: {
        teacher: { select: { firstName: true, lastName: true } },
      },
    });

    for (const schedule of schedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        throw new ConflictException(
          `Преподаватель ${schedule.teacher.firstName} ${schedule.teacher.lastName} уже занят в это время: ${scheduleStart} - ${scheduleEnd}`,
        );
      }
    }
  }

  /**
   * Извлечение строки времени в формате HH:MM из Date объекта
   */
  private extractTimeString(dateTime: Date): string {
    const hours = dateTime.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Проверка пересечения двух временных диапазонов
   */
  private checkTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Min = toMinutes(start1);
    const end1Min = toMinutes(end1);
    const start2Min = toMinutes(start2);
    const end2Min = toMinutes(end2);

    return start1Min < end2Min && end1Min > start2Min;
  }
}
