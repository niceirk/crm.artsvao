import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../common/services/s3-storage.service';
import {
  CreateMedicalCertificateDto,
  UpdateMedicalCertificateDto,
  ApplyToSchedulesDto,
  MedicalCertificateFilterDto,
  PreviewSchedulesDto,
} from './dto';

@Injectable()
export class MedicalCertificatesService {
  constructor(
    private prisma: PrismaService,
    private s3StorageService: S3StorageService,
  ) {}

  /**
   * Создать справку (файл опциональный)
   */
  async create(
    dto: CreateMedicalCertificateDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ) {
    // Проверяем, что клиент существует
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    // Проверяем даты
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания');
    }

    // Загружаем файл в S3 если есть
    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (file) {
      const uploadResult = await this.s3StorageService.uploadImage(
        file,
        'medical-certificates',
        2048, // max width
        90, // quality
      );
      fileUrl = uploadResult.imageUrl;
      fileName = file.originalname;
    }

    // Создаем справку
    const certificate = await this.prisma.medicalCertificate.create({
      data: {
        clientId: dto.clientId,
        fileUrl,
        fileName,
        startDate,
        endDate,
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appliedSchedules: {
          include: {
            schedule: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                group: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Если переданы scheduleIds, применяем статус EXCUSED
    if (dto.scheduleIds && dto.scheduleIds.length > 0) {
      await this.applyToSchedules(
        certificate.id,
        {
          scheduleIds: dto.scheduleIds,
          compensationMonths: dto.compensationMonths,
        },
        userId,
      );
    }

    return certificate;
  }

  /**
   * Получить список справок с фильтрацией и пагинацией
   */
  async findAll(filter: MedicalCertificateFilterDto) {
    const { clientId, dateFrom, dateTo, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) {
        where.startDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.startDate.lte = new Date(dateTo);
      }
    }

    const [rawItems, total] = await Promise.all([
      this.prisma.medicalCertificate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          appliedSchedules: {
            select: {
              compensationAmount: true,
              compensationMonth: true,
            },
          },
          _count: {
            select: {
              appliedSchedules: true,
            },
          },
        },
      }),
      this.prisma.medicalCertificate.count({ where }),
    ]);

    // Добавляем агрегированные данные о компенсации
    const items = rawItems.map((cert) => {
      const totalCompensation = cert.appliedSchedules.reduce(
        (sum, s) => sum + (s.compensationAmount ? Number(s.compensationAmount) : 0),
        0,
      );
      const compensationMonths = [
        ...new Set(
          cert.appliedSchedules
            .map((s) => s.compensationMonth)
            .filter((m): m is string => !!m),
        ),
      ].sort();

      // Удаляем appliedSchedules из ответа, чтобы не нагружать
      const { appliedSchedules, ...rest } = cert;

      return {
        ...rest,
        totalCompensation,
        compensationMonths,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить справку по ID
   */
  async findOne(id: string) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appliedSchedules: {
          include: {
            schedule: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                group: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            attendance: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Справка не найдена');
    }

    return certificate;
  }

  /**
   * Получить справки клиента
   */
  async findByClient(clientId: string) {
    return this.prisma.medicalCertificate.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            appliedSchedules: true,
          },
        },
      },
    });
  }

  /**
   * Обновить справку
   */
  async update(id: string, dto: UpdateMedicalCertificateDto) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      throw new NotFoundException('Справка не найдена');
    }

    const updateData: any = {};

    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Проверяем даты
    const startDate = updateData.startDate || certificate.startDate;
    const endDate = updateData.endDate || certificate.endDate;

    if (startDate > endDate) {
      throw new BadRequestException('Дата начала не может быть позже даты окончания');
    }

    return this.prisma.medicalCertificate.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        appliedSchedules: {
          include: {
            schedule: {
              select: {
                id: true,
                date: true,
                startTime: true,
                endTime: true,
                group: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Удалить справку
   */
  async remove(id: string) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      throw new NotFoundException('Справка не найдена');
    }

    // Удаляем файл из S3
    if (certificate.fileUrl) {
      try {
        await this.s3StorageService.deleteImage(certificate.fileUrl);
      } catch (error) {
        console.error('Ошибка удаления файла из S3:', error);
      }
    }

    await this.prisma.medicalCertificate.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Предпросмотр занятий клиента за период
   * Возвращает занятия, к которым можно применить справку
   * Включает информацию о студии, абонементе и сумме компенсации
   */
  async previewSchedules(dto: PreviewSchedulesDto) {
    const { clientId, startDate, endDate } = dto;
    console.log('[previewSchedules] Called with:', { clientId, startDate, endDate });

    const start = new Date(startDate);
    const end = new Date(endDate);
    console.log('[previewSchedules] Parsed dates:', { start, end });

    // 0. Получить клиента с льготной категорией для расчета скидки
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        benefitCategory: {
          select: {
            id: true,
            discountPercent: true,
            isActive: true,
          },
        },
      },
    });

    // 1. Найти группы где клиент является активным участником
    const groupMembers = await this.prisma.groupMember.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
      },
      select: {
        groupId: true,
        joinedAt: true,
        leftAt: true,
      },
    });

    const groupIdsFromMembers = groupMembers.map((gm) => gm.groupId);

    // 2. Найти активные абонементы клиента в этот период (с полной информацией)
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        clientId,
        status: 'ACTIVE',
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        groupId: true,
        validMonth: true,
        purchaseDate: true,
        pricePerLesson: true,
        paidPrice: true,
        subscriptionType: {
          select: {
            id: true,
            name: true,
            type: true,
            pricePerLesson: true,
          },
        },
      },
    });

    // Собираем все группы из абонементов
    const groupIdsFromSubscriptions = subscriptions
      .map((sub) => sub.groupId)
      .filter((id): id is string => id !== null);

    // Объединяем группы из членств и абонементов
    const allGroupIds = [...new Set([...groupIdsFromMembers, ...groupIdsFromSubscriptions])];

    console.log('[previewSchedules] Groups from members:', groupIdsFromMembers.length);
    console.log('[previewSchedules] Groups from subscriptions:', groupIdsFromSubscriptions.length);
    console.log('[previewSchedules] Total unique groups:', allGroupIds.length);

    if (allGroupIds.length === 0) {
      return [];
    }

    // 3. Найти занятия групп за период (с информацией о студии)
    const schedules = await this.prisma.schedule.findMany({
      where: {
        groupId: { in: allGroupIds },
        date: {
          gte: start,
          lte: end,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            studio: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attendances: {
          where: { clientId },
          select: {
            id: true,
            status: true,
            subscriptionDeducted: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    console.log('[previewSchedules] Found schedules:', schedules.length);

    // Подготовить данные для fallback расчёта pricePerLesson
    // Собираем все уникальные комбинации groupId + validMonth из абонементов
    const groupMonthsForFallback = subscriptions
      .filter((sub): sub is typeof sub & { groupId: string; validMonth: string } =>
        sub.groupId !== null && sub.validMonth !== null)
      .map((sub) => ({ groupId: sub.groupId, validMonth: sub.validMonth }));

    // Подсчитываем ВСЕ занятия месяца для каждой комбинации (для fallback)
    const allSchedulesCountByGroupMonth = await this.getSchedulesCountForGroupMonths(groupMonthsForFallback);

    // 4. Фильтровать: оставить только занятия, покрытые абонементом
    // Занятия без абонемента (без основания или по разовому посещению) не подлежат компенсации
    const result = schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.date);

      // Проверяем, есть ли активный абонемент на дату занятия
      const hasActiveSubscription = subscriptions.some((sub) => {
        const subStart = new Date(sub.startDate);
        const subEnd = new Date(sub.endDate);
        return (
          sub.groupId === schedule.groupId &&
          subStart <= scheduleDate &&
          subEnd >= scheduleDate
        );
      });

      // Только занятия с абонементом подлежат компенсации
      return hasActiveSubscription;
    });

    console.log('[previewSchedules] Filtered result:', result.length);

    // Преобразуем в нужный формат с информацией об абонементе и компенсации
    return result.map((schedule) => {
      const scheduleDate = new Date(schedule.date);
      const month = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, '0')}`;

      // Найти абонемент для этого занятия
      const matchingSubscription = subscriptions.find((sub) => {
        const subStart = new Date(sub.startDate);
        const subEnd = new Date(sub.endDate);
        return (
          sub.groupId === schedule.groupId &&
          subStart <= scheduleDate &&
          subEnd >= scheduleDate
        );
      });

      // Рассчитать компенсацию
      let compensationAmount: number | null = null;
      let pricePerLesson: number | null = null;

      if (matchingSubscription) {
        // Приоритет: subscriptionType.pricePerLesson → subscription.pricePerLesson → fallback
        if (matchingSubscription.subscriptionType.pricePerLesson) {
          // Используем цену за занятие из типа абонемента
          pricePerLesson = Number(matchingSubscription.subscriptionType.pricePerLesson);
        } else if (matchingSubscription.pricePerLesson) {
          // Используем сохранённую цену за занятие в абонементе
          pricePerLesson = Number(matchingSubscription.pricePerLesson);
        } else if (matchingSubscription.paidPrice && matchingSubscription.groupId && matchingSubscription.validMonth) {
          // Fallback для старых абонементов без pricePerLesson
          const key = `${matchingSubscription.groupId}_${matchingSubscription.validMonth}`;
          const allSchedulesInMonth = allSchedulesCountByGroupMonth.get(key) || 1;
          pricePerLesson = Math.round(Number(matchingSubscription.paidPrice) / allSchedulesInMonth);
        }

        // Применяем скидку клиента к компенсации
        if (pricePerLesson !== null) {
          const discountPercent = client?.benefitCategory?.isActive
            ? Number(client.benefitCategory.discountPercent)
            : 0;
          compensationAmount = Math.round(pricePerLesson * (1 - discountPercent / 100) * 100) / 100;
        }
      }

      return {
        id: schedule.id,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        group: schedule.group,
        currentAttendance: schedule.attendances[0] || null,
        subscription: matchingSubscription
          ? {
              id: matchingSubscription.id,
              name: matchingSubscription.subscriptionType.name,
              type: matchingSubscription.subscriptionType.type,
              pricePerLesson,
              validMonth: matchingSubscription.validMonth,
              purchaseDate: matchingSubscription.purchaseDate,
            }
          : null,
        compensationAmount,
      };
    });
  }

  /**
   * Применить статус EXCUSED к выбранным занятиям
   * Сохраняет информацию о компенсации (абонемент, сумма, месяц применения)
   */
  async applyToSchedules(
    certificateId: string,
    dto: ApplyToSchedulesDto,
    userId: string,
  ) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Справка не найдена');
    }

    // Выполняем все операции в транзакции для защиты от race conditions
    return this.prisma.$transaction(async (tx) => {
      // Создаём Map для быстрого доступа к данным о компенсации по scheduleId
      const scheduleCompensationMap = new Map<string, {
        subscriptionId?: string;
        compensationAmount?: number;
        compensationMonth?: string;
      }>();

      // Если переданы scheduleCompensations, используем их напрямую
      if (dto.scheduleCompensations) {
        for (const sc of dto.scheduleCompensations) {
          scheduleCompensationMap.set(sc.scheduleId, {
            subscriptionId: sc.subscriptionId,
            compensationAmount: sc.compensationAmount,
            compensationMonth: sc.compensationMonth,
          });
        }
      }

      // Если переданы compensationMonths (по абонементам), нужно связать их с занятиями
      // Для этого нужно получить занятия и их абонементы
      if (dto.compensationMonths && dto.compensationMonths.length > 0) {
        const compensationMonthMap = new Map(
          dto.compensationMonths.map((cm) => [cm.subscriptionId, cm.compensationMonth])
        );

        // Получаем информацию о занятиях и их абонементах
        const schedulesWithSubs = await tx.schedule.findMany({
          where: { id: { in: dto.scheduleIds } },
          include: {
            attendances: {
              where: { clientId: certificate.clientId },
              select: { subscriptionId: true },
            },
          },
        });

        // Получаем абонементы клиента для определения подходящего абонемента для каждого занятия
        const subscriptions = await tx.subscription.findMany({
          where: {
            clientId: certificate.clientId,
            id: { in: Array.from(compensationMonthMap.keys()) },
          },
          select: {
            id: true,
            groupId: true,
            startDate: true,
            endDate: true,
            pricePerLesson: true,
            paidPrice: true,
            subscriptionType: {
              select: {
                pricePerLesson: true,
              },
            },
          },
        });

        // Получаем клиента с льготной категорией для расчета скидки
        const client = await tx.client.findUnique({
          where: { id: certificate.clientId },
          select: {
            benefitCategory: {
              select: {
                discountPercent: true,
                isActive: true,
              },
            },
          },
        });

        for (const schedule of schedulesWithSubs) {
          // Находим подходящий абонемент для этого занятия
          const scheduleDate = new Date(schedule.date);
          const matchingSub = subscriptions.find((sub) => {
            return (
              sub.groupId === schedule.groupId &&
              new Date(sub.startDate) <= scheduleDate &&
              new Date(sub.endDate) >= scheduleDate
            );
          });

          if (matchingSub) {
            const compensationMonth = compensationMonthMap.get(matchingSub.id);
            const existing = scheduleCompensationMap.get(schedule.id) || {};

            // Рассчитываем сумму компенсации если не задана
            let compensationAmount = existing.compensationAmount;
            if (!compensationAmount) {
              let pricePerLesson: number | null = null;

              // Приоритет: subscriptionType.pricePerLesson → subscription.pricePerLesson → fallback
              if (matchingSub.subscriptionType.pricePerLesson) {
                pricePerLesson = Number(matchingSub.subscriptionType.pricePerLesson);
              } else if (matchingSub.pricePerLesson) {
                pricePerLesson = Number(matchingSub.pricePerLesson);
              } else if (matchingSub.paidPrice) {
                // Простой fallback
                pricePerLesson = Math.round(Number(matchingSub.paidPrice) / 8);
              }

              // Применяем скидку клиента
              if (pricePerLesson !== null) {
                const discountPercent = client?.benefitCategory?.isActive
                  ? Number(client.benefitCategory.discountPercent)
                  : 0;
                compensationAmount = Math.round(pricePerLesson * (1 - discountPercent / 100) * 100) / 100;
              }
            }

            scheduleCompensationMap.set(schedule.id, {
              subscriptionId: matchingSub.id,
              compensationAmount,
              compensationMonth,
            });
          }
        }
      }

      const results = [];
      const formatDate = (date: Date) => date.toLocaleDateString('ru-RU');
      const noteText = `Справка от ${formatDate(certificate.startDate)} до ${formatDate(certificate.endDate)}`;

      for (const scheduleId of dto.scheduleIds) {
        // Проверяем, не была ли уже применена эта справка к этому занятию
        const existingLink = await tx.medicalCertificateSchedule.findUnique({
          where: {
            medicalCertificateId_scheduleId: {
              medicalCertificateId: certificateId,
              scheduleId,
            },
          },
        });

        if (existingLink) {
          continue; // Пропускаем, если уже применена
        }

        // Найти или создать Attendance
        let attendance = await tx.attendance.findFirst({
          where: {
            scheduleId,
            clientId: certificate.clientId,
          },
        });

        const previousStatus = attendance?.status || null;

        if (attendance) {
          // Обновить существующую запись на EXCUSED
          attendance = await tx.attendance.update({
            where: { id: attendance.id },
            data: {
              status: 'EXCUSED',
              notes: noteText,
              markedBy: userId,
              markedAt: new Date(),
            },
          });
        } else {
          // Создать новую запись с EXCUSED
          attendance = await tx.attendance.create({
            data: {
              scheduleId,
              clientId: certificate.clientId,
              status: 'EXCUSED',
              notes: noteText,
              markedBy: userId,
              markedAt: new Date(),
            },
          });
        }

        // Получаем данные о компенсации для этого занятия
        const compensationData = scheduleCompensationMap.get(scheduleId);

        // Сохранить связь справки с занятием (включая данные о компенсации)
        await tx.medicalCertificateSchedule.create({
          data: {
            medicalCertificateId: certificateId,
            scheduleId,
            attendanceId: attendance.id,
            previousStatus,
            subscriptionId: compensationData?.subscriptionId,
            compensationAmount: compensationData?.compensationAmount,
            compensationMonth: compensationData?.compensationMonth,
          },
        });

        results.push({
          scheduleId,
          attendanceId: attendance.id,
          previousStatus,
          subscriptionId: compensationData?.subscriptionId,
          compensationAmount: compensationData?.compensationAmount,
          compensationMonth: compensationData?.compensationMonth,
        });
      }

      return {
        applied: results.length,
        results,
      };
    });
  }

  /**
   * Получить занятия, к которым применена справка
   */
  async getAppliedSchedules(certificateId: string) {
    const certificate = await this.prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Справка не найдена');
    }

    return this.prisma.medicalCertificateSchedule.findMany({
      where: { medicalCertificateId: certificateId },
      include: {
        schedule: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        attendance: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Получить доступные периоды (года и месяцы с записями)
   */
  async getAvailablePeriods() {
    const certificates = await this.prisma.medicalCertificate.findMany({
      select: {
        startDate: true,
      },
      orderBy: { startDate: 'desc' },
    });

    const yearsSet = new Set<number>();
    const monthsByYear = new Map<number, Set<number>>();

    for (const cert of certificates) {
      const date = new Date(cert.startDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      yearsSet.add(year);

      if (!monthsByYear.has(year)) {
        monthsByYear.set(year, new Set());
      }
      monthsByYear.get(year)!.add(month);
    }

    const years = Array.from(yearsSet).sort((a, b) => b - a);
    const months: Record<number, number[]> = {};

    for (const [year, monthsSet] of monthsByYear) {
      months[year] = Array.from(monthsSet).sort((a, b) => a - b);
    }

    return { years, months };
  }

  /**
   * Подсчитать количество занятий в группе за месяц
   * Используется для fallback расчёта pricePerLesson у старых абонементов
   */
  private async countSchedulesInMonth(groupId: string, validMonth: string): Promise<number> {
    const [year, month] = validMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return this.prisma.schedule.count({
      where: {
        groupId,
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { not: 'CANCELLED' },
      },
    });
  }

  /**
   * Подсчитать количество занятий для списка групп и месяцев
   * Возвращает Map<"groupId_validMonth", count>
   */
  private async getSchedulesCountForGroupMonths(
    groupMonths: Array<{ groupId: string; validMonth: string }>
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // Группируем по уникальным комбинациям
    const uniqueKeys = [...new Set(groupMonths.map(gm => `${gm.groupId}_${gm.validMonth}`))];

    // Выполняем запросы параллельно
    const counts = await Promise.all(
      uniqueKeys.map(async (key) => {
        const [groupId, validMonth] = key.split('_');
        const count = await this.countSchedulesInMonth(groupId, validMonth);
        return { key, count };
      })
    );

    for (const { key, count } of counts) {
      result.set(key, count);
    }

    return result;
  }
}
