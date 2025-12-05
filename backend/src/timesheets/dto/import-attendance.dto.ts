import { IsUUID, IsNotEmpty } from 'class-validator';

export class ImportAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  groupId: string;
}

export interface ImportAttendanceRowResult {
  row: number;
  fio: string;
  dateTime: string;
  status: 'imported' | 'skipped' | 'client_not_found' | 'schedule_not_found';
  message: string;
  existingStatus?: string;
  newStatus?: string;
}

export interface ImportAttendanceResult {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    skipped: number;
    clientNotFound: number;
    scheduleNotFound: number;
  };
  results: ImportAttendanceRowResult[];
}
