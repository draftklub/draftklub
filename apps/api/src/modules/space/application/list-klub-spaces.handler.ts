import { Injectable } from '@nestjs/common';
import { SpacePrismaRepository } from '../infrastructure/repositories/space.prisma.repository';

@Injectable()
export class ListKlubSpacesHandler {
  constructor(private readonly spaceRepo: SpacePrismaRepository) {}

  async execute(klubId: string, includeInactive = false) {
    return this.spaceRepo.findManyByKlub(klubId, includeInactive);
  }
}
