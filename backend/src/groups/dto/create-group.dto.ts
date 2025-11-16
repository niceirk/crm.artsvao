import { IsString, IsInt, IsEnum, IsOptional, IsNumber, IsUUID, Min, IsArray, ValidateNested } from 'class-validator';
import { GroupStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class WeeklyScheduleItemDto {
  @IsInt()
  @Min(0)
  day: number; // 0-6 (пн-вс)

  @IsString()
  startTime: string; // HH:mm

  @IsString()
  endTime: string; // HH:mm
}

export class CreateGroupDto {
  @IsUUID()
  studioId: string;

  @IsString()
  name: string;

  @IsUUID()
  teacherId: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsInt()
  @Min(1)
  maxParticipants: number;

  @IsNumber()
  @Min(0)
  singleSessionPrice: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ageMin?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ageMax?: number;

  @IsInt()
  @Min(15)
  @IsOptional()
  duration?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyScheduleItemDto)
  @IsOptional()
  weeklySchedule?: WeeklyScheduleItemDto[];

  @IsEnum(GroupStatus)
  @IsOptional()
  status?: GroupStatus;
}
