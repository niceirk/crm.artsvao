import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientNoteDto } from './dto/create-client-note.dto';
import { UpdateClientNoteDto } from './dto/update-client-note.dto';

@Injectable()
export class ClientNotesService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, createClientNoteDto: CreateClientNoteDto, userId: string) {
    // Verify that client exists
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    return this.prisma.clientNote.create({
      data: {
        clientId,
        content: createClientNoteDto.content,
        createdBy: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(clientId: string) {
    return this.prisma.clientNote.findMany({
      where: { clientId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const note = await this.prisma.clientNote.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException(`Client note with ID ${id} not found`);
    }

    return note;
  }

  async update(id: string, updateClientNoteDto: UpdateClientNoteDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.clientNote.update({
      where: { id },
      data: updateClientNoteDto,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    return this.prisma.clientNote.delete({
      where: { id },
    });
  }
}
