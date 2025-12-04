import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class GetHourlyOccupancyDto {
  @IsString()
  roomId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  dates: string[]; // массив дат в формате 'yyyy-MM-dd'
}
