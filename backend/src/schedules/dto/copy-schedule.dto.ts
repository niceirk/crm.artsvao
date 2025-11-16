import { IsArray, IsDateString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CopyScheduleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  scheduleIds: string[];

  @IsDateString()
  targetDate: string; // ISO date to copy to

  @IsOptional()
  @IsBoolean()
  preserveTime?: boolean = true; // Keep same time slots

  @IsOptional()
  @IsBoolean()
  autoEnrollClients?: boolean = true; // Auto-enroll clients
}
