import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  SpacePrismaRepository,
  type UpdateSpaceData,
} from '../infrastructure/repositories/space.prisma.repository';

export interface UpdateSpaceCommand {
  klubId: string;
  spaceId: string;
  patch: UpdateSpaceData;
}

@Injectable()
export class UpdateSpaceHandler {
  constructor(private readonly spaceRepo: SpacePrismaRepository) {}

  async execute(cmd: UpdateSpaceCommand) {
    const space = await this.spaceRepo.findById(cmd.spaceId);
    if (!space || space.deletedAt) {
      throw new NotFoundException(`Space ${cmd.spaceId} não encontrado`);
    }
    if (space.klubId !== cmd.klubId) {
      // Tenta editar Space de outro Klub via path manipulation — bloqueado.
      throw new ForbiddenException(`Space ${cmd.spaceId} não pertence a este Klub`);
    }
    return this.spaceRepo.update(cmd.spaceId, cmd.patch);
  }
}
