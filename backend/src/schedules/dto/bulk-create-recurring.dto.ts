import {
  IsUUID,
  IsArray,
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Элемент расписания для массового создания
 */
export class BulkScheduleItemDto {
  @IsUUID()
  groupId: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  roomId: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime: string;
}

/**
 * DTO для массового создания занятий
 */
export class BulkCreateRecurringDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkScheduleItemDto)
  schedules: BulkScheduleItemDto[];

  @IsBoolean()
  @IsOptional()
  autoEnrollClients?: boolean = true;
}

/**
 * Результат массового создания
 */
export interface BulkCreateResult {
  created: {
    count: number;
    schedules: any[];
  };
  failed: {
    count: number;
    errors: Array<{
      schedule: BulkScheduleItemDto;
      reason: string;
    }>;
  };
}
