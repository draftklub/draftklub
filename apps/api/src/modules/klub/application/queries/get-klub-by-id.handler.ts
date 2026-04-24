import { Injectable, NotFoundException } from '@nestjs/common';
import { KlubPrismaRepository } from '../../infrastructure/repositories/klub.prisma.repository';

@Injectable()
export class GetKlubByIdHandler {
  constructor(private readonly klubRepo: KlubPrismaRepository) {}

  async execute(id: string) {
    const klub = await this.klubRepo.findById(id);
    if (!klub) throw new NotFoundException(`Klub ${id} not found`);

    return {
      id: klub.id,
      name: klub.name,
      slug: klub.slug,
      type: klub.type,
      plan: klub.plan,
      status: klub.status,
      city: klub.city,
      state: klub.state,
      timezone: klub.timezone,
      email: klub.email,
      phone: klub.phone,
      documentHint: klub.documentHint,
      legalName: klub.legalName,
      isGroup: klub.isGroup,
      parentKlubId: klub.parentKlubId,
      sports: klub.sports.map((s) => s.sportCode),
      config: klub.config ? {
        bookingPolicy: klub.config.bookingPolicy,
        cancellationWindowHours: klub.config.cancellationWindowHours,
        openingHour: klub.config.openingHour,
        closingHour: klub.config.closingHour,
        openDays: klub.config.openDays,
      } : null,
      createdAt: klub.createdAt,
    };
  }
}
