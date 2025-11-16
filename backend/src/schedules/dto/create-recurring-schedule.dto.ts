import { IsUUID, IsEnum, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleType } from '@prisma/client';
import { RecurrenceRuleDto } from './recurrence-rule.dto';

export class CreateRecurringScheduleDto {
  @IsUUID()
  groupId: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  roomId: string;

  @IsEnum(ScheduleType)
  @IsOptional()
  type?: ScheduleType = ScheduleType.GROUP_CLASS;

  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrenceRule: RecurrenceRuleDto;

  @IsBoolean()
  @IsOptional()
  autoEnrollClients?: boolean = true;
}
