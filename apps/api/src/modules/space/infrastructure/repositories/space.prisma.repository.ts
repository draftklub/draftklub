import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CreateSpaceData {
  klubId: string;
  name: string;
  type: string;
  sportCode?: string;
  surface?: string;
  indoor: boolean;
  hasLighting: boolean;
  maxPlayers: number;
  description?: string;
  slotGranularityMinutes: number;
  slotDefaultDurationMinutes: number;
  hourBands: unknown;
  allowedMatchTypes: string[];
}

export interface UpdateSpaceData {
  name?: string;
  type?: string;
  sportCode?: string;
  surface?: string;
  indoor?: boolean;
  hasLighting?: boolean;
  maxPlayers?: number;
  description?: string;
  slotGranularityMinutes?: number;
  slotDefaultDurationMinutes?: number;
  hourBands?: unknown;
  allowedMatchTypes?: string[];
  status?: string;
  bookingActive?: boolean;
}

@Injectable()
export class SpacePrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSpaceData) {
    return this.prisma.space.create({
      data: {
        klubId: data.klubId,
        name: data.name,
        type: data.type as $Enums.SpaceType,
        sportCode: data.sportCode,
        surface: data.surface as $Enums.SpaceSurface,
        indoor: data.indoor,
        hasLighting: data.hasLighting,
        maxPlayers: data.maxPlayers,
        description: data.description,
        slotGranularityMinutes: data.slotGranularityMinutes,
        slotDefaultDurationMinutes: data.slotDefaultDurationMinutes,
        hourBands: data.hourBands as Prisma.InputJsonValue,
        allowedMatchTypes: data.allowedMatchTypes,
      },
    });
  }

  async findManyByKlub(klubId: string, includeInactive = false) {
    return this.prisma.space.findMany({
      where: {
        klubId,
        deletedAt: null,
        ...(includeInactive ? {} : { status: { not: 'inactive' } }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.space.findUnique({ where: { id } });
  }

  async update(id: string, data: UpdateSpaceData) {
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.sportCode !== undefined) patch.sportCode = data.sportCode;
    if (data.surface !== undefined) patch.surface = data.surface;
    if (data.indoor !== undefined) patch.indoor = data.indoor;
    if (data.hasLighting !== undefined) patch.hasLighting = data.hasLighting;
    if (data.maxPlayers !== undefined) patch.maxPlayers = data.maxPlayers;
    if (data.description !== undefined) patch.description = data.description;
    if (data.slotGranularityMinutes !== undefined)
      patch.slotGranularityMinutes = data.slotGranularityMinutes;
    if (data.slotDefaultDurationMinutes !== undefined)
      patch.slotDefaultDurationMinutes = data.slotDefaultDurationMinutes;
    if (data.hourBands !== undefined) patch.hourBands = data.hourBands;
    if (data.allowedMatchTypes !== undefined) patch.allowedMatchTypes = data.allowedMatchTypes;
    if (data.status !== undefined) patch.status = data.status;
    if (data.bookingActive !== undefined) patch.bookingActive = data.bookingActive;

    return this.prisma.space.update({ where: { id }, data: patch });
  }
}
