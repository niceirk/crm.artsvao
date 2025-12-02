import { IsArray, IsDateString, IsUUID } from 'class-validator';

export class BatchAvailabilityDto {
  @IsArray()
  @IsUUID('4', { each: true })
  workspaceIds: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
