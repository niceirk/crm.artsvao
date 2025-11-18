import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDocumentDto } from './create-client-document.dto';

export class UpdateClientDocumentDto extends PartialType(CreateClientDocumentDto) {}
