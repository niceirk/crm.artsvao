import {
  IsUUID,
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Элемент недельного расписания (паттерн)
 */
export class WeeklyScheduleItemDto {
  @IsString()
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;
}

/**
 * Группа для preview
 */
export class PreviewGroupDto {
  @IsUUID()
  groupId: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  roomId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleItemDto)
  weeklySchedule: WeeklyScheduleItemDto[];

  @IsNumber()
  duration: number;
}

/**
 * DTO для preview создания расписания нескольких групп
 */
export class PreviewRecurringScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewGroupDto)
  groups: PreviewGroupDto[];

  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month must be in YYYY-MM format' })
  month: string;
}

/**
 * Информация о конфликте
 */
export interface ConflictInfo {
  type: 'room' | 'teacher' | 'rental' | 'event';
  reason: string;
}

/**
 * Элемент preview расписания
 */
export interface PreviewScheduleItem {
  tempId: string; // Временный ID для выбора/отмены выбора
  groupId: string;
  groupName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName: string;
  teacherId: string;
  teacherName: string;
  hasConflict: boolean;
  conflicts: ConflictInfo[];
}

/**
 * Результат preview
 */
export interface PreviewResult {
  schedules: PreviewScheduleItem[];
  summary: {
    total: number;
    withConflicts: number;
    byGroup: Record<string, { total: number; conflicts: number; groupName: string }>;
  };
}
