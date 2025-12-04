import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TimepadService } from './timepad.service';
import {
  GetOrdersQueryDto,
  TimepadParticipantsResponseDto,
} from './dto/timepad-orders.dto';

@ApiTags('Timepad')
@Controller('timepad')
export class TimepadController {
  constructor(private readonly timepadService: TimepadService) {}

  @Get('events/:eventId/orders')
  @ApiOperation({ summary: 'Получить участников мероприятия по ID события Timepad' })
  @ApiParam({ name: 'eventId', description: 'ID события в Timepad' })
  @ApiResponse({ status: 200, type: TimepadParticipantsResponseDto })
  async getOrdersByEventId(
    @Param('eventId') eventId: string,
    @Query() query: GetOrdersQueryDto,
  ): Promise<TimepadParticipantsResponseDto> {
    const response = await this.timepadService.getEventOrders(eventId, {
      limit: query.limit,
      skip: query.skip,
      email: query.email,
    });

    return this.timepadService['transformOrdersToParticipants'](response);
  }

  @Get('participants')
  @ApiOperation({ summary: 'Получить участников по ссылке на Timepad' })
  @ApiQuery({ name: 'link', description: 'Ссылка на мероприятие Timepad' })
  @ApiResponse({ status: 200, type: TimepadParticipantsResponseDto })
  async getParticipantsByLink(
    @Query('link') link: string,
    @Query() query: GetOrdersQueryDto,
  ): Promise<TimepadParticipantsResponseDto> {
    return this.timepadService.getParticipantsByLink(link, {
      limit: query.limit,
      skip: query.skip,
      email: query.email,
    });
  }

  @Get('extract-id')
  @ApiOperation({ summary: 'Извлечь ID события из ссылки Timepad' })
  @ApiQuery({ name: 'link', description: 'Ссылка на мероприятие Timepad' })
  extractEventId(@Query('link') link: string): { eventId: string | null } {
    return { eventId: this.timepadService.extractEventId(link) };
  }
}
