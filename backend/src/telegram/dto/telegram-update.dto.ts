import { IsNotEmpty, IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TelegramUpdate } from '../interfaces/telegram-api.interface';

export class TelegramUpdateDto implements TelegramUpdate {
  @IsNumber()
  @IsNotEmpty()
  update_id: number;

  @IsOptional()
  @IsObject()
  message?: any;

  @IsOptional()
  @IsObject()
  edited_message?: any;

  @IsOptional()
  @IsObject()
  channel_post?: any;

  @IsOptional()
  @IsObject()
  edited_channel_post?: any;

  @IsOptional()
  @IsObject()
  callback_query?: any;
}
