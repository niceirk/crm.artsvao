import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';
import { IsInt, IsOptional, IsBoolean, IsString } from 'class-validator';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsInt()
  @IsOptional()
  version?: number; // Для защиты от перезатирания

  @IsBoolean()
  @IsOptional()
  isCompensated?: boolean; // При отмене - считать компенсацией

  @IsString()
  @IsOptional()
  compensationNote?: string; // Комментарий к компенсации
}
