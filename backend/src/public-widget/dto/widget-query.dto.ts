import { IsOptional, IsString, IsInt, Min, Max, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class WidgetStudiosQueryDto {
  @IsOptional()
  @IsString()
  studioId?: string;
}

export class WidgetEventsQueryDto {
  @IsOptional()
  @IsString()
  eventTypeId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  @IsBoolean()
  isForChildren?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  @IsBoolean()
  hasAvailableSeats?: boolean;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
