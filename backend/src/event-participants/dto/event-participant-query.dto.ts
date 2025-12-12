import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { EventParticipantStatus } from '@prisma/client';

export class EventParticipantQueryDto {
  @IsEnum(EventParticipantStatus)
  @IsOptional()
  status?: EventParticipantStatus;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 50;
}
