import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface CreatePointsSchemaCommand {
  klubSportId: string;
  name: string;
  description?: string;
  points: Record<string, number>;
  createdById?: string;
}

@Injectable()
export class CreatePointsSchemaHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CreatePointsSchemaCommand) {
    const profile = await this.prisma.klubSportProfile.findUnique({
      where: { id: cmd.klubSportId },
    });
    if (!profile) {
      throw new NotFoundException(`KlubSportProfile ${cmd.klubSportId} not found`);
    }

    return this.prisma.rankingPointsSchema.create({
      data: {
        klubSportId: cmd.klubSportId,
        name: cmd.name,
        description: cmd.description,
        points: cmd.points,
        createdById: cmd.createdById,
      },
    });
  }
}
