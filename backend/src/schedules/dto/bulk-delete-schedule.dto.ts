import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkDeleteScheduleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  scheduleIds: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}
