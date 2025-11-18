import { PartialType } from '@nestjs/mapped-types';
import { CreateClientNoteDto } from './create-client-note.dto';

export class UpdateClientNoteDto extends PartialType(CreateClientNoteDto) {}
