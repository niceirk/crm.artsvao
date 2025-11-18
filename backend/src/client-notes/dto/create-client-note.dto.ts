import { IsString, IsNotEmpty } from 'class-validator';

export class CreateClientNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
