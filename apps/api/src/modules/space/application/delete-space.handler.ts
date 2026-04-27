import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { SpacePrismaRepository } from '../infrastructure/repositories/space.prisma.repository';

export interface DeleteSpaceCommand {
  klubId: string;
  spaceId: string;
}

/**
 * Sprint Polish PR-D — soft delete de Space. Bloqueia se houver
 * bookings futuros (status confirmed/pending) — admin precisa cancelar
 * primeiro pra evitar reservas órfãs.
 *
 * Implementado como soft delete (`deletedAt = now()`) + `bookingActive
 * = false` pra defesa em profundidade (queries antigas ignoram
 * deletedAt mas o flag previne novas reservas mesmo assim).
 */
@Injectable()
export class DeleteSpaceHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaceRepo: SpacePrismaRepository,
  ) {}

  async execute(cmd: DeleteSpaceCommand) {
    const space = await this.spaceRepo.findById(cmd.spaceId);
    if (!space || space.deletedAt) {
      throw new NotFoundException(`Space ${cmd.spaceId} não encontrado`);
    }
    if (space.klubId !== cmd.klubId) {
      throw new ForbiddenException(`Space ${cmd.spaceId} não pertence a este Klub`);
    }

    const futureBookings = await this.prisma.booking.count({
      where: {
        spaceId: cmd.spaceId,
        status: { in: ['pending', 'confirmed'] },
        startsAt: { gte: new Date() },
        deletedAt: null,
      },
    });
    if (futureBookings > 0) {
      throw new BadRequestException(
        `Cannot delete: ${futureBookings} future booking(s) exist. Cancel them first.`,
      );
    }

    return this.prisma.space.update({
      where: { id: cmd.spaceId },
      data: { deletedAt: new Date(), bookingActive: false, status: 'inactive' },
    });
  }
}
