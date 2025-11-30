import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания
}
