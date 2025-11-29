import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ClientRelationsService } from './client-relations.service';
import { CreateRelationDto } from './dto/create-relation.dto';
import { UpdateRelationDto } from './dto/update-relation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ClientRelationsController {
  constructor(
    private readonly clientRelationsService: ClientRelationsService,
  ) {}

  /**
   * POST /api/clients/:clientId/relations
   * Создать родственную связь
   */
  @Post('clients/:clientId/relations')
  create(
    @Param('clientId') clientId: string,
    @Body(ValidationPipe) createRelationDto: CreateRelationDto,
  ) {
    return this.clientRelationsService.createRelation(
      clientId,
      createRelationDto,
    );
  }

  /**
   * GET /api/clients/:clientId/relations
   * Получить все родственные связи клиента
   */
  @Get('clients/:clientId/relations')
  findAll(@Param('clientId') clientId: string) {
    return this.clientRelationsService.getClientRelations(clientId);
  }

  /**
   * PATCH /api/clients/:clientId/relations/:relationId
   * Обновить тип родственной связи
   */
  @Patch('clients/:clientId/relations/:relationId')
  update(
    @Param('clientId') clientId: string,
    @Param('relationId') relationId: string,
    @Body(ValidationPipe) updateRelationDto: UpdateRelationDto,
  ) {
    return this.clientRelationsService.updateRelation(clientId, relationId, updateRelationDto);
  }

  /**
   * DELETE /api/clients/:clientId/relations/:relationId
   * Удалить родственную связь
   */
  @Delete('clients/:clientId/relations/:relationId')
  remove(
    @Param('clientId') clientId: string,
    @Param('relationId') relationId: string,
  ) {
    return this.clientRelationsService.deleteRelation(clientId, relationId);
  }
}
