import { Controller, Get, Param, Query, Header, Post, Body } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PublicWidgetService } from './public-widget.service';
import { WidgetStudiosQueryDto, WidgetEventsQueryDto } from './dto/widget-query.dto';

@Controller('public/widget')
export class PublicWidgetController {
  constructor(private readonly widgetService: PublicWidgetService) {}

  /**
   * Получить список студий с группами и расписанием
   * GET /api/public/widget/studios
   * GET /api/public/widget/studios?studioId=xxx
   */
  @Public()
  @Get('studios')
  @Header('Cache-Control', 'public, max-age=60')
  async getStudios(@Query() query: WidgetStudiosQueryDto) {
    return this.widgetService.getStudios(query.studioId);
  }

  /**
   * Получить список типов событий для фильтра
   * GET /api/public/widget/event-types
   */
  @Public()
  @Get('event-types')
  @Header('Cache-Control', 'public, max-age=300')
  async getEventTypes() {
    return this.widgetService.getEventTypes();
  }

  /**
   * Получить даты с мероприятиями (для линейки дат)
   * GET /api/public/widget/event-dates
   */
  @Public()
  @Get('event-dates')
  @Header('Cache-Control', 'public, max-age=300')
  async getEventDates() {
    return this.widgetService.getEventDates(30);
  }

  /**
   * Получить список предстоящих мероприятий
   * GET /api/public/widget/events
   * GET /api/public/widget/events?eventTypeId=xxx&limit=10&isForChildren=true&date=2025-12-11
   */
  @Public()
  @Get('events')
  @Header('Cache-Control', 'public, max-age=60')
  async getEvents(@Query() query: WidgetEventsQueryDto) {
    return this.widgetService.getEvents({
      eventTypeId: query.eventTypeId,
      isForChildren: query.isForChildren,
      hasAvailableSeats: query.hasAvailableSeats,
      date: query.date,
      limit: query.limit,
    });
  }

  /**
   * Получить детали мероприятия
   * GET /api/public/widget/events/:id
   */
  @Public()
  @Get('events/:id')
  @Header('Cache-Control', 'public, max-age=60')
  async getEvent(@Param('id') id: string) {
    return this.widgetService.getEvent(id);
  }

  /**
   * Получить количество доступных билетов из Timepad
   * POST /api/public/widget/tickets-availability
   * Body: { eventIds: string[] }
   */
  @Public()
  @Post('tickets-availability')
  @Header('Cache-Control', 'public, max-age=30')
  async getTicketsAvailability(@Body() body: { eventIds: string[] }) {
    return this.widgetService.getTicketsAvailability(body.eventIds);
  }
}
