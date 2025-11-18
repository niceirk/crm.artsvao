import { IsArray, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportEventsDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  taskIds?: number[];
}

export class PyrusTaskPreviewDto {
  id: number;
  text: string;
  createDate: string;
  lastModifiedDate: string;
  fields: {
    id: number;
    name?: string;
    type: string;
    value?: any;
  }[];
}

export class ImportResultDto {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    taskId: number;
    error: string;
  }>;
}
