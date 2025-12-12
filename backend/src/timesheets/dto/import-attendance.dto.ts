import { IsUUID, IsNotEmpty, IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class ImportAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  groupId: string;
}

// Кандидат для ручной привязки клиента
export interface PossibleClient {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
}

// Расширенный результат строки импорта
export interface ImportAttendanceRowResult {
  row: number;
  fio: string;
  dateTime: string;
  status: 'imported' | 'skipped' | 'conflict' | 'client_not_found' | 'schedule_not_found';
  message: string;
  existingStatus?: string;
  newStatus?: string;
  // ID для разрешения конфликтов
  attendanceId?: string;
  scheduleId?: string;
  clientId?: string;
  // Кандидаты для ручной привязки при client_not_found
  possibleClients?: PossibleClient[];
}

// Расширенная сводка импорта
export interface ImportAttendanceSummary {
  total: number;
  imported: number;
  skipped: number;
  conflicts: number;
  clientNotFound: number;
  scheduleNotFound: number;
}

export interface ImportAttendanceResult {
  success: boolean;
  summary: ImportAttendanceSummary;
  results: ImportAttendanceRowResult[];
}

// DTO для разрешения одного конфликта
export class ConflictResolutionItem {
  @IsOptional()
  @IsUUID()
  attendanceId?: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @IsUUID()
  clientId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsEnum(['keep_crm', 'use_file', 'skip'])
  resolution: 'keep_crm' | 'use_file' | 'skip';
}

// DTO для batch разрешения конфликтов
export class ResolveImportConflictsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionItem)
  resolutions: ConflictResolutionItem[];
}

// Результат разрешения конфликтов
export interface ResolveImportConflictsResult {
  updated: number;
  created: number;
  skipped: number;
}
