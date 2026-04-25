import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { GetSpaceAvailabilityHandler } from './get-space-availability.handler';

@Injectable()
export class GetKlubCalendarHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityHandler: GetSpaceAvailabilityHandler,
  ) {}

  async execute(klubId: string, date: string) {
    const klub = await this.prisma.klub.findUnique({
      where: { id: klubId },
      include: { config: true },
    });
    if (!klub) throw new NotFoundException('Klub not found');

    const spaces = await this.prisma.space.findMany({
      where: {
        klubId,
        status: 'active',
        bookingActive: true,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });

    const spaceAvailabilities = await Promise.all(
      spaces.map((s) => this.availabilityHandler.execute(s.id, date)),
    );

    return {
      klubId,
      klubName: klub.name,
      date,
      agendaVisibility: klub.config?.agendaVisibility ?? 'public',
      spaces: spaceAvailabilities,
    };
  }
}
