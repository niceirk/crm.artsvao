import { IsString, IsDateString } from 'class-validator';

export class GetRoomMonthlyOccupancyDto {
  @IsString()
  roomId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
