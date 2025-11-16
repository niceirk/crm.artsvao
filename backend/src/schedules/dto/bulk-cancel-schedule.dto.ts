import { IsArray, IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';

export enum CancelAction {
  CANCEL = 'CANCEL', // Just cancel
  TRANSFER = 'TRANSFER', // Transfer to another date
}

export class BulkCancelScheduleDto {
  @IsArray()
  @IsUUID('4', { each: true })
  scheduleIds: string[];

  @IsString()
  reason: string; // Cancellation reason

  @IsEnum(CancelAction)
  action: CancelAction;

  @IsOptional()
  @IsString()
  transferDate?: string; // Required if action=TRANSFER

  @IsOptional()
  @IsString()
  transferStartTime?: string; // HH:mm format

  @IsOptional()
  @IsString()
  transferEndTime?: string; // HH:mm format

  @IsOptional()
  @IsBoolean()
  notifyClients?: boolean = true; // Send notifications
}
