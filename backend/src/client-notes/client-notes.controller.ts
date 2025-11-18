import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClientNotesService } from './client-notes.service';
import { CreateClientNoteDto } from './dto/create-client-note.dto';
import { UpdateClientNoteDto } from './dto/update-client-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('clients/:clientId/notes')
@UseGuards(JwtAuthGuard)
export class ClientNotesController {
  constructor(private readonly clientNotesService: ClientNotesService) {}

  @Post()
  create(
    @Param('clientId') clientId: string,
    @Body() createClientNoteDto: CreateClientNoteDto,
    @Request() req,
  ) {
    return this.clientNotesService.create(clientId, createClientNoteDto, req.user.id);
  }

  @Get()
  findAll(@Param('clientId') clientId: string) {
    return this.clientNotesService.findAll(clientId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientNotesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientNoteDto: UpdateClientNoteDto) {
    return this.clientNotesService.update(id, updateClientNoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientNotesService.remove(id);
  }
}
