import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventParticipantsService } from './event-participants.service';
import { CreateEventParticipantDto, EventParticipantQueryDto } from './dto';

@Controller('events/:eventId/participants')
@UseGuards(JwtAuthGuard)
export class EventParticipantsController {
  constructor(private readonly participantsService: EventParticipantsService) {}

  /**
   * Проверка доступности мест на мероприятии
   */
  @Get('availability')
  async checkAvailability(@Param('eventId') eventId: string) {
    return this.participantsService.checkAvailability(eventId);
  }

  /**
   * Получение списка участников мероприятия
   */
  @Get()
  async getParticipants(
    @Param('eventId') eventId: string,
    @Query() query: EventParticipantQueryDto,
  ) {
    return this.participantsService.getEventParticipants(eventId, query);
  }

  /**
   * Регистрация участника на мероприятие
   */
  @Post()
  async registerParticipant(
    @Param('eventId') eventId: string,
    @Body() dto: Omit<CreateEventParticipantDto, 'eventId'>,
    @Request() req,
  ) {
    return this.participantsService.registerParticipant(
      { ...dto, eventId },
      req.user?.id,
    );
  }

  /**
   * Отмена регистрации участника
   */
  @Delete(':clientId')
  async cancelRegistration(
    @Param('eventId') eventId: string,
    @Param('clientId') clientId: string,
    @Request() req,
  ) {
    return this.participantsService.cancelRegistration(eventId, clientId, req.user?.id);
  }

  /**
   * Подтверждение присутствия участника
   */
  @Patch(':clientId/confirm')
  async confirmAttendance(
    @Param('eventId') eventId: string,
    @Param('clientId') clientId: string,
    @Request() req,
  ) {
    return this.participantsService.confirmAttendance(eventId, clientId, req.user?.id);
  }

  /**
   * Отметка неявки участника
   */
  @Patch(':clientId/no-show')
  async markNoShow(
    @Param('eventId') eventId: string,
    @Param('clientId') clientId: string,
    @Request() req,
  ) {
    return this.participantsService.markNoShow(eventId, clientId, req.user?.id);
  }
}
