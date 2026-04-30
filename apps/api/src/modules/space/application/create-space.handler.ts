import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  SpacePrismaRepository,
  type CreateSpaceData,
} from '../infrastructure/repositories/space.prisma.repository';

export interface CreateSpaceCommand extends Omit<CreateSpaceData, 'klubId'> {
  klubId: string;
}

/**
 * Cria Space (quadra) de um Klub. Pré-condições:
 * - Klub existe, não está soft-deleted, está aprovado (`reviewStatus='approved'`).
 *   Klubs em pending review não podem cadastrar inventário ainda.
 *
 * Caller (controller) garante autorização via PolicyEngine
 * (`klub.spaces.create` com `klubId` resolver).
 */
@Injectable()
export class CreateSpaceHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaceRepo: SpacePrismaRepository,
  ) {}

  async execute(cmd: CreateSpaceCommand) {
    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      select: { id: true, deletedAt: true, review: { select: { reviewStatus: true } } },
    });
    if (!klub || klub.deletedAt) {
      throw new NotFoundException(`Klub ${cmd.klubId} não encontrado`);
    }
    if (klub.review?.reviewStatus !== 'approved') {
      throw new BadRequestException({
        type: 'klub_not_approved',
        message: 'Klub ainda não foi aprovado pela plataforma — aguarde a revisão.',
      });
    }
    return this.spaceRepo.create(cmd);
  }
}
