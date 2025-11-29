import { IsUUID, IsDateString, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CompensationMonthInputDto {
  @ApiProperty({ description: 'ID абонемента' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ description: 'Месяц компенсации в формате YYYY-MM' })
  @IsString()
  compensationMonth: string;
}

export class CreateMedicalCertificateDto {
  @ApiProperty({ description: 'ID клиента' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Дата начала болезни', example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Дата окончания болезни', example: '2024-01-20' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Примечания' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'ID занятий для применения статуса EXCUSED' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  scheduleIds?: string[];

  @ApiPropertyOptional({ description: 'Месяцы компенсации по абонементам (JSON строка или массив)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;

    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        return undefined;
      }
    }

    if (!Array.isArray(parsed)) return undefined;

    // Создаём экземпляры класса для правильной валидации
    return parsed.map((item: any) => {
      const dto = new CompensationMonthInputDto();
      dto.subscriptionId = item.subscriptionId;
      dto.compensationMonth = item.compensationMonth;
      return dto;
    });
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompensationMonthInputDto)
  compensationMonths?: CompensationMonthInputDto[];
}
