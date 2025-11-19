import { IsArray, IsUUID } from 'class-validator';

export class SyncEventsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  eventIds: string[];
}

export interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ eventId: string; error: string }>;
  details: Array<{ eventId: string; externalId?: string; synced: boolean }>;
}
