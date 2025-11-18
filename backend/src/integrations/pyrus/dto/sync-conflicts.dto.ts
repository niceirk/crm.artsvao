import { IsEnum, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ConflictResolution {
  USE_CRM = 'USE_CRM',
  USE_PYRUS = 'USE_PYRUS',
  SKIP = 'SKIP',
}

export class EventTypeConflictDto {
  id: string; // ID в CRM
  pyrusId: string; // ID в Pyrus
  crmData: {
    name: string;
    description?: string;
    color?: string;
    updatedAt: Date;
  };
  pyrusData: {
    name: string;
  };
  lastSyncedAt?: Date;
}

export class RoomConflictDto {
  id: string; // ID в CRM
  pyrusId: string; // ID в Pyrus
  crmData: {
    name: string;
    updatedAt: Date;
  };
  pyrusData: {
    name: string;
  };
  lastSyncedAt?: Date;
}

export class SyncConflictsResponseDto {
  eventTypeConflicts: EventTypeConflictDto[];
  roomConflicts: RoomConflictDto[];
  hasConflicts: boolean;
}

export class ConflictResolutionItem {
  @IsString()
  id: string; // ID объекта в CRM

  @IsEnum(ConflictResolution)
  resolution: ConflictResolution;
}

export class ResolveEventTypeConflictsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionItem)
  resolutions: ConflictResolutionItem[];
}

export class ResolveRoomConflictsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionItem)
  resolutions: ConflictResolutionItem[];
}

export class SyncWithResolutionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionItem)
  eventTypeResolutions?: ConflictResolutionItem[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionItem)
  roomResolutions?: ConflictResolutionItem[];
}
