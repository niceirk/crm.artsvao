import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(4096)
  text: string;
}
