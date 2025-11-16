import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictCheckerService } from '../shared/conflict-checker.service';
import { BulkUpdateScheduleDto } from './dto/bulk-update-schedule.dto';
import { CopyScheduleDto } from './dto/copy-schedule.dto';
import { BulkCancelScheduleDto, CancelAction } from './dto/bulk-cancel-schedule.dto';
import { BulkDeleteScheduleDto } from './dto/bulk-delete-schedule.dto';

export interface BulkUpdateResult {
  updated: {
    count: number;
    schedule: any[];
  };
  failed: {
    count: number;
    errors: any[];
  };
}

export interface CopyResult {
  created: {
    count: number;
    schedule: any[];
  };
  skipped: {
    count: number;
    conflicts: any[];
  };
}

export interface BulkCancelResult {
  cancelled: {
    count: number;
    scheduleIds: string[];
  };
  transferred?: {
    count: number;
    schedule: any[];
  };
  failed: {
    count: number;
    errors: any[];
  };
}

export interface BulkDeleteResult {
  deleted: {
    count: number;
    scheduleIds: string[];
  };
  totalCancelledEnrollments: number;
  failed: {
    count: number;
    errors: any[];
  };
}

@Injectable()
export class BulkScheduleService {
  constructor(
    private prisma: PrismaService,
    private conflictChecker: ConflictCheckerService,
  ) {}

  /**
   * Bulk update schedules
   */
  async bulkUpdate(dto: BulkUpdateScheduleDto): Promise<BulkUpdateResult> {
    const updated: any[] = [];
    const failed: any[] = [];

    // Validate all schedules exist
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { in: dto.scheduleIds },
      },
    });

    if (schedules.length === 0) {
      throw new NotFoundException('No schedules found with provided IDs');
    }

    // Validate entities if provided
    if (dto.groupId || dto.teacherId || dto.roomId) {
      await this.validateEntities(dto.groupId, dto.teacherId, dto.roomId);
    }

    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Build update data
        const updateData: any = {};

        if (dto.groupId) updateData.groupId = dto.groupId;
        if (dto.teacherId) updateData.teacherId = dto.teacherId;
        if (dto.roomId) updateData.roomId = dto.roomId;
        if (dto.type) updateData.type = dto.type;
        if (dto.status) updateData.status = dto.status;

        // Handle time updates
        if (dto.startTime) {
          const [hour, min] = dto.startTime.split(':').map(Number);
          updateData.startTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
        }
        if (dto.endTime) {
          const [hour, min] = dto.endTime.split(':').map(Number);
          updateData.endTime = new Date(Date.UTC(1970, 0, 1, hour, min, 0));
        }

        // Check conflicts if room or teacher changed
        if (dto.roomId || dto.teacherId || dto.startTime || dto.endTime) {
          const dateStr = schedule.date.toISOString().split('T')[0];
          const startTime = dto.startTime || this.formatTime(schedule.startTime);
          const endTime = dto.endTime || this.formatTime(schedule.endTime);

          const hasConflict = await this.checkConflictForSchedule(
            schedule.id,
            dateStr,
            startTime,
            endTime,
            dto.roomId || schedule.roomId,
            dto.teacherId || schedule.teacherId,
          );

          if (hasConflict) {
            failed.push({
              scheduleId: schedule.id,
              reason: hasConflict.reason,
            });
            continue;
          }
        }

        // Update schedule
        const updatedSchedule = await this.prisma.schedule.update({
          where: { id: schedule.id },
          data: updateData,
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
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
                number: true,
              },
            },
          },
        });

        updated.push(updatedSchedule);
      } catch (error) {
        failed.push({
          scheduleId: schedule.id,
          reason: error.message,
        });
      }
    }

    return {
      updated: {
        count: updated.length,
        schedule: updated,
      },
      failed: {
        count: failed.length,
        errors: failed,
      },
    };
  }

  /**
   * Copy schedules to a new date
   */
  async copySchedules(dto: CopyScheduleDto): Promise<CopyResult> {
    const created: any[] = [];
    const skipped: any[] = [];

    // Validate all schedules exist
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { in: dto.scheduleIds },
      },
      include: {
        group: true,
        teacher: true,
        room: true,
      },
    });

    if (schedules.length === 0) {
      throw new NotFoundException('No schedules found with provided IDs');
    }

    const targetDate = new Date(dto.targetDate);

    // Process each schedule
    for (const schedule of schedules) {
      try {
        const startTime = this.formatTime(schedule.startTime);
        const endTime = this.formatTime(schedule.endTime);
        const dateStr = targetDate.toISOString().split('T')[0];

        // Check conflicts
        const hasConflict = await this.checkConflictForDate(
          dateStr,
          startTime,
          endTime,
          schedule.roomId,
          schedule.teacherId,
        );

        if (hasConflict) {
          skipped.push({
            originalScheduleId: schedule.id,
            targetDate: dateStr,
            reason: hasConflict.reason,
          });
          continue;
        }

        // Create new schedule
        const newSchedule = await this.prisma.schedule.create({
          data: {
            groupId: schedule.groupId,
            teacherId: schedule.teacherId,
            roomId: schedule.roomId,
            date: targetDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            type: schedule.type,
            status: 'PLANNED',
            isRecurring: false,
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
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
                number: true,
              },
            },
          },
        });

        // Auto-enroll clients if requested
        let enrolledClients = 0;
        if (dto.autoEnrollClients) {
          enrolledClients = await this.enrollClientsToSchedule(
            newSchedule.id,
            schedule.groupId,
            targetDate,
          );
        }

        created.push({
          ...newSchedule,
          enrolledClients,
          copiedFrom: schedule.id,
        });
      } catch (error) {
        skipped.push({
          originalScheduleId: schedule.id,
          targetDate: dto.targetDate,
          reason: error.message,
        });
      }
    }

    return {
      created: {
        count: created.length,
        schedule: created,
      },
      skipped: {
        count: skipped.length,
        conflicts: skipped,
      },
    };
  }

  /**
   * Bulk cancel or transfer schedules
   */
  async bulkCancel(dto: BulkCancelScheduleDto): Promise<BulkCancelResult> {
    const cancelled: string[] = [];
    const transferred: any[] = [];
    const failed: any[] = [];

    // Validate all schedules exist
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { in: dto.scheduleIds },
      },
      include: {
        group: true,
        teacher: true,
        room: true,
        attendances: {
          include: {
            client: true,
          },
        },
      },
    });

    if (schedules.length === 0) {
      throw new NotFoundException('No schedules found with provided IDs');
    }

    // Process each schedule
    for (const schedule of schedules) {
      try {
        if (dto.action === CancelAction.CANCEL) {
          // Just cancel
          await this.prisma.schedule.update({
            where: { id: schedule.id },
            data: {
              status: 'CANCELLED',
            },
          });

          // Update attendances
          await this.prisma.attendance.updateMany({
            where: { scheduleId: schedule.id },
            data: { status: 'ABSENT' },
          });

          cancelled.push(schedule.id);
        } else if (dto.action === CancelAction.TRANSFER) {
          // Validate transfer parameters
          if (!dto.transferDate) {
            throw new BadRequestException('Transfer date is required for TRANSFER action');
          }

          const transferDate = new Date(dto.transferDate);
          const startTime = dto.transferStartTime || this.formatTime(schedule.startTime);
          const endTime = dto.transferEndTime || this.formatTime(schedule.endTime);
          const dateStr = transferDate.toISOString().split('T')[0];

          // Check conflicts for new date
          const hasConflict = await this.checkConflictForDate(
            dateStr,
            startTime,
            endTime,
            schedule.roomId,
            schedule.teacherId,
          );

          if (hasConflict) {
            failed.push({
              scheduleId: schedule.id,
              reason: `Cannot transfer: ${hasConflict.reason}`,
            });
            continue;
          }

          // Cancel original schedule
          await this.prisma.schedule.update({
            where: { id: schedule.id },
            data: {
              status: 'CANCELLED',
            },
          });

          // Create new schedule
          const [startHour, startMin] = startTime.split(':').map(Number);
          const [endHour, endMin] = endTime.split(':').map(Number);

          const newSchedule = await this.prisma.schedule.create({
            data: {
              groupId: schedule.groupId,
              teacherId: schedule.teacherId,
              roomId: schedule.roomId,
              date: transferDate,
              startTime: new Date(Date.UTC(1970, 0, 1, startHour, startMin, 0)),
              endTime: new Date(Date.UTC(1970, 0, 1, endHour, endMin, 0)),
              type: schedule.type,
              status: 'PLANNED',
              isRecurring: false,
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
              teacher: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              room: {
                select: {
                  id: true,
                  name: true,
                  number: true,
                },
              },
            },
          });

          // Transfer attendances
          for (const attendance of schedule.attendances) {
            await this.prisma.attendance.create({
              data: {
                scheduleId: newSchedule.id,
                clientId: attendance.clientId,
                status: 'PRESENT',
                subscriptionDeducted: false,
              },
            });
          }

          cancelled.push(schedule.id);
          transferred.push({
            ...newSchedule,
            transferredFrom: schedule.id,
            transferredClients: schedule.attendances.length,
          });
        }
      } catch (error) {
        failed.push({
          scheduleId: schedule.id,
          reason: error.message,
        });
      }
    }

    const result: BulkCancelResult = {
      cancelled: {
        count: cancelled.length,
        scheduleIds: cancelled,
      },
      failed: {
        count: failed.length,
        errors: failed,
      },
    };

    if (dto.action === CancelAction.TRANSFER) {
      result.transferred = {
        count: transferred.length,
        schedule: transferred,
      };
    }

    return result;
  }

  /**
   * Validate entities exist
   */
  private async validateEntities(
    groupId?: string,
    teacherId?: string,
    roomId?: string,
  ) {
    const promises: Promise<any>[] = [];

    if (groupId) {
      promises.push(
        this.prisma.group.findUnique({ where: { id: groupId } }).then((group) => {
          if (!group) throw new BadRequestException(`Group with ID ${groupId} not found`);
        }),
      );
    }

    if (teacherId) {
      promises.push(
        this.prisma.teacher.findUnique({ where: { id: teacherId } }).then((teacher) => {
          if (!teacher)
            throw new BadRequestException(`Teacher with ID ${teacherId} not found`);
        }),
      );
    }

    if (roomId) {
      promises.push(
        this.prisma.room.findUnique({ where: { id: roomId } }).then((room) => {
          if (!room) throw new BadRequestException(`Room with ID ${roomId} not found`);
        }),
      );
    }

    await Promise.all(promises);
  }

  /**
   * Check conflict for a schedule update
   */
  private async checkConflictForSchedule(
    scheduleId: string,
    date: string,
    startTime: string,
    endTime: string,
    roomId: string,
    teacherId: string,
  ): Promise<any | null> {
    try {
      await this.conflictChecker.checkConflicts({
        date,
        startTime,
        endTime,
        roomIds: [roomId],
        teacherId,
        excludeScheduleId: scheduleId,
      });
      return null;
    } catch (error) {
      return {
        reason: error.message,
        type: error.message.includes('Room') ? 'room' : 'teacher',
      };
    }
  }

  /**
   * Check conflict for a new date
   */
  private async checkConflictForDate(
    date: string,
    startTime: string,
    endTime: string,
    roomId: string,
    teacherId: string,
  ): Promise<any | null> {
    try {
      await this.conflictChecker.checkConflicts({
        date,
        startTime,
        endTime,
        roomIds: [roomId],
        teacherId,
      });
      return null;
    } catch (error) {
      return {
        reason: error.message,
        type: error.message.includes('Room') ? 'room' : 'teacher',
      };
    }
  }

  /**
   * Auto-enroll clients to schedule
   */
  private async enrollClientsToSchedule(
    scheduleId: string,
    groupId: string,
    scheduleDate: Date,
  ): Promise<number> {
    const scheduleMonth = this.formatMonth(scheduleDate);

    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
        validMonth: scheduleMonth,
      },
      include: {
        client: true,
      },
    });

    if (activeSubscriptions.length === 0) {
      return 0;
    }

    let enrolledCount = 0;

    for (const subscription of activeSubscriptions) {
      await this.prisma.attendance.create({
        data: {
          scheduleId,
          clientId: subscription.clientId,
          status: 'PRESENT',
          subscriptionDeducted: false,
        },
      });

      enrolledCount++;
    }

    return enrolledCount;
  }

  /**
   * Format time from Date to HH:mm
   */
  private formatTime(time: Date): string {
    const hours = time.getUTCHours().toString().padStart(2, '0');
    const minutes = time.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format month as YYYY-MM
   */
  private formatMonth(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Bulk delete schedules with automatic subscription refund
   */
  async bulkDelete(dto: BulkDeleteScheduleDto): Promise<BulkDeleteResult> {
    const deleted: string[] = [];
    const failed: any[] = [];
    let totalCancelledEnrollments = 0;

    // Validate all schedules exist
    const schedules = await this.prisma.schedule.findMany({
      where: {
        id: { in: dto.scheduleIds },
      },
      include: {
        group: true,
        attendances: true,
      },
    });

    if (schedules.length === 0) {
      throw new NotFoundException('No schedules found with provided IDs');
    }

    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Return visits to subscriptions and delete attendances
        if (schedule.attendances.length > 0) {
          for (const attendance of schedule.attendances) {
            // If subscription was deducted, return the visit
            if (attendance.subscriptionDeducted) {
              await this.returnVisitToSubscription(
                schedule.date,
                schedule.groupId,
                attendance.clientId,
              );
            }
            totalCancelledEnrollments++;
          }

          // Delete all attendance records
          await this.prisma.attendance.deleteMany({
            where: { scheduleId: schedule.id },
          });
        }

        // Delete the schedule
        await this.prisma.schedule.delete({
          where: { id: schedule.id },
        });

        deleted.push(schedule.id);
      } catch (error) {
        failed.push({
          scheduleId: schedule.id,
          reason: error.message,
        });
      }
    }

    return {
      deleted: {
        count: deleted.length,
        scheduleIds: deleted,
      },
      totalCancelledEnrollments,
      failed: {
        count: failed.length,
        errors: failed,
      },
    };
  }

  /**
   * Return a visit to the client's subscription
   */
  private async returnVisitToSubscription(
    scheduleDate: Date,
    groupId: string,
    clientId: string,
  ) {
    const scheduleMonth = this.formatMonth(scheduleDate);

    // Find the subscription for this group and month
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        clientId,
        groupId,
        validMonth: scheduleMonth,
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent subscription
      },
    });

    if (!subscription) {
      // No subscription found - nothing to return
      return;
    }

    // Return one visit
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        remainingVisits: {
          increment: 1,
        },
      },
    });

    // If subscription was expired due to 0 visits, reactivate it
    if (subscription.status === 'EXPIRED' && subscription.remainingVisits === 0) {
      const currentDate = new Date();
      // Only reactivate if within validity period
      if (currentDate >= subscription.startDate && currentDate <= subscription.endDate) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'ACTIVE',
          },
        });
      }
    }
  }
}
