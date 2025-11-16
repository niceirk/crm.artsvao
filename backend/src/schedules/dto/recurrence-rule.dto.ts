import { IsArray, IsDateString, IsInt, ValidateNested, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RecurrenceTimeDto {
  @IsString()
  start: string; // HH:mm format

  @IsString()
  end: string; // HH:mm format
}

export class RecurrenceRuleDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @IsDateString()
  startDate: string; // ISO date "2024-12-01"

  @IsDateString()
  endDate: string; // ISO date "2024-12-31"

  @ValidateNested()
  @Type(() => RecurrenceTimeDto)
  time: RecurrenceTimeDto;
}
