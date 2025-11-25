import { IsArray, IsString, IsBoolean, ArrayMinSize } from 'class-validator';

export class CreateBulkInvoicesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  clientIds: string[];

  @IsString()
  groupId: string;

  @IsString()
  targetMonth: string;

  @IsBoolean()
  sendNotifications: boolean;
}
