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
  excludeApplicationId?: string; // Exclude rentals by rentalApplicationId
  excludeEventId?: string;
  excludeReservationId?: string;
}

@Injectable()
export class ConflictCheckerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Универсальная проверка конфликтов для всех типов событий
   * Проверяет конфликты в Schedule, Rental, Event и Reservation таблицах
   * ОПТИМИЗИРОВАНО: вместо N×4 запросов делается 4 параллельных запроса для всех комнат
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
      excludeApplicationId,
      excludeEventId,
      excludeReservationId,
    } = params;

    const checkDate = new Date(date);

    // Оптимизация: делаем все запросы параллельно для всех комнат сразу
    const [schedules, rentals, events, reservations] = await Promise.all([
      // 1. Загружаем все занятия для всех комнат
      this.prisma.schedule.findMany({
        where: {
          date: checkDate,
          roomId: { in: roomIds },
          id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
          status: { not: 'CANCELLED' },
        },
        include: {
          group: { select: { name: true } },
          room: { select: { name: true } },
        },
      }),

      // 2. Загружаем всю аренду для всех комнат
      this.prisma.rental.findMany({
        where: {
          date: checkDate,
          roomId: { in: roomIds },
          id: excludeRentalId ? { not: excludeRentalId } : undefined,
          rentalApplicationId: excludeApplicationId ? { not: excludeApplicationId } : undefined,
          status: { not: 'CANCELLED' },
        },
        include: {
          room: { select: { name: true } },
        },
      }),

      // 3. Загружаем все мероприятия для всех комнат
      this.prisma.event.findMany({
        where: {
          date: checkDate,
          roomId: { in: roomIds },
          id: excludeEventId ? { not: excludeEventId } : undefined,
          status: { not: 'CANCELLED' },
        },
        include: {
          eventType: { select: { name: true } },
          room: { select: { name: true } },
        },
      }),

      // 4. Загружаем все резервы для всех комнат
      this.prisma.reservation.findMany({
        where: {
          date: checkDate,
          roomId: { in: roomIds },
          id: excludeReservationId ? { not: excludeReservationId } : undefined,
          status: { not: 'CANCELLED' },
        },
        include: {
          room: { select: { name: true } },
        },
      }),
    ]);

    // Проверяем конфликты в загруженных данных
    this.checkScheduleTimeConflicts(schedules, startTime, endTime);
    this.checkRentalTimeConflicts(rentals, startTime, endTime);
    this.checkEventTimeConflicts(events, startTime, endTime);
    this.checkReservationTimeConflicts(reservations, startTime, endTime);

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
   * Проверка конфликтов времени с занятиями
   */
  private checkScheduleTimeConflicts(
    schedules: any[],
    startTime: string,
    endTime: string,
  ): void {
    for (const schedule of schedules) {
      const scheduleStart = this.extractTimeString(schedule.startTime);
      const scheduleEnd = this.extractTimeString(schedule.endTime);

      if (this.checkTimeOverlap(startTime, endTime, scheduleStart, scheduleEnd)) {
        const groupInfo = schedule.group
          ? ` (группа: ${schedule.group.name})`
          : ' (индивидуальное занятие)';
        const roomInfo = schedule.room ? ` в комнате "${schedule.room.name}"` : '';
        throw new ConflictException(
          `Комната уже занята занятием${groupInfo}${roomInfo} в это время: ${scheduleStart} - ${scheduleEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов времени с арендой
   */
  private checkRentalTimeConflicts(
    rentals: any[],
    startTime: string,
    endTime: string,
  ): void {
    for (const rental of rentals) {
      const rentalStart = this.extractTimeString(rental.startTime);
      const rentalEnd = this.extractTimeString(rental.endTime);

      if (this.checkTimeOverlap(startTime, endTime, rentalStart, rentalEnd)) {
        const roomInfo = rental.room ? ` в комнате "${rental.room.name}"` : '';
        throw new ConflictException(
          `Комната${roomInfo} уже сдана в аренду в это время: ${rentalStart} - ${rentalEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов времени с мероприятиями
   */
  private checkEventTimeConflicts(
    events: any[],
    startTime: string,
    endTime: string,
  ): void {
    for (const event of events) {
      const eventStart = this.extractTimeString(event.startTime);
      const eventEnd = this.extractTimeString(event.endTime);

      if (this.checkTimeOverlap(startTime, endTime, eventStart, eventEnd)) {
        const eventInfo = event.eventType ? ` (${event.eventType.name})` : '';
        const roomInfo = event.room ? ` в комнате "${event.room.name}"` : '';
        throw new ConflictException(
          `Комната${roomInfo} уже занята мероприятием "${event.name}"${eventInfo} в это время: ${eventStart} - ${eventEnd}`,
        );
      }
    }
  }

  /**
   * Проверка конфликтов времени с резервами
   */
  private checkReservationTimeConflicts(
    reservations: any[],
    startTime: string,
    endTime: string,
  ): void {
    for (const reservation of reservations) {
      const reservationStart = this.extractTimeString(reservation.startTime);
      const reservationEnd = this.extractTimeString(reservation.endTime);

      if (this.checkTimeOverlap(startTime, endTime, reservationStart, reservationEnd)) {
        const roomInfo = reservation.room ? ` в комнате "${reservation.room.name}"` : '';
        throw new ConflictException(
          `Комната${roomInfo} уже зарезервирована в это время: ${reservationStart} - ${reservationEnd}`,
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
