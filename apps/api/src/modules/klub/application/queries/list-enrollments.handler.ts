import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListEnrollmentsByProfileHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubId: string, sportCode: string) {
    const profile = await this.prisma.klubSportProfile.findFirst({
      where: { klubId, sportCode },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Sport profile not found');
    return this.prisma.playerSportEnrollment.findMany({
      where: { klubSportProfileId: profile.id },
      orderBy: { enrolledAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });
  }
}

@Injectable()
export class ListEnrollmentsByUserHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string) {
    return this.prisma.playerSportEnrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      include: {
        klubSportProfile: {
          select: { id: true, klubId: true, sportCode: true, name: true },
        },
      },
    });
  }
}
