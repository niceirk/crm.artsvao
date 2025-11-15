import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  getRecentLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.auditLogService.getRecentLogs(parsedLimit);
  }

  @Get('entity/:entityType/:entityId')
  getEntityLogs(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.getEntityLogs(entityType, entityId);
  }

  @Get('user/:userId')
  getUserLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditLogService.getUserLogs(userId, parsedLimit);
  }
}
