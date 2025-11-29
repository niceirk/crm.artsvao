import { IsArray, IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CompensationMonthDto {
  @ApiProperty({ description: 'ID абонемента' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ description: 'Месяц применения компенсации (YYYY-MM)', example: '2025-12' })
  @IsString()
  compensationMonth: string;
}

export class ScheduleCompensationDto {
  @ApiProperty({ description: 'ID занятия' })
  @IsUUID()
  scheduleId: string;

  @ApiPropertyOptional({ description: 'ID абонемента' })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({ description: 'Сумма компенсации' })
  @IsOptional()
  compensationAmount?: number;

  @ApiPropertyOptional({ description: 'Месяц применения компенсации (YYYY-MM)' })
  @IsOptional()
  @IsString()
  compensationMonth?: string;
}

export class ApplyToSchedulesDto {
  @ApiProperty({ description: 'ID занятий для применения статуса EXCUSED', type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  scheduleIds: string[];

  @ApiPropertyOptional({
    description: 'Месяцы применения компенсации по абонементам',
    type: [CompensationMonthDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompensationMonthDto)
  compensationMonths?: CompensationMonthDto[];

  @ApiPropertyOptional({
    description: 'Детальная информация о компенсации для каждого занятия',
    type: [ScheduleCompensationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleCompensationDto)
  scheduleCompensations?: ScheduleCompensationDto[];
}
