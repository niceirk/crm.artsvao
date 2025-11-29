import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { NovofonService } from './novofon.service';
import { InitiateCallDto } from './dto/initiate-call.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('integrations/novofon')
@UseGuards(JwtAuthGuard)
export class NovofonController {
  constructor(private readonly novofonService: NovofonService) {}

  @Post('call')
  async initiateCall(@Request() req, @Body() dto: InitiateCallDto) {
    return this.novofonService.initiateCall(req.user.id, dto);
  }

  @Get('history')
  async getCallHistory(
    @Query('clientId') clientId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.novofonService.getCallHistory({
      clientId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getSettings() {
    return this.novofonService.getSettings();
  }

  @Patch('settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.novofonService.updateSettings(dto);
  }

  @Get('test')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async testConnection() {
    return this.novofonService.testConnection();
  }

  @Get('employees')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getEmployees() {
    return this.novofonService.getEmployees();
  }

  @Get('virtual-numbers')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getVirtualNumbers() {
    return this.novofonService.getVirtualNumbers();
  }
}
