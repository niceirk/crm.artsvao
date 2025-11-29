import { IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewSchedulesDto {
  @ApiProperty({ description: 'ID клиента' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Дата начала периода', example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Дата окончания периода', example: '2024-01-20' })
  @IsDateString()
  endDate: string;
}
