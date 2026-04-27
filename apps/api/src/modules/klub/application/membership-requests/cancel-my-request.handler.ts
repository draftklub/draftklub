import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

/**
 * User cancela a própria solicitação pendente. Só permite cancel de
 * `pending` (decisões já tomadas ficam imutáveis pra audit).
 */
@Injectable()
export class CancelMyRequestHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { requestId: string; userId: string }): Promise<{ id: string }> {
    const req = await this.prisma.membershipRequest.findUnique({
      where: { id: input.requestId },
      select: { id: true, userId: true, status: true },
    });
    if (!req) {
      throw new NotFoundException(`Solicitação ${input.requestId} não encontrada`);
    }
    if (req.userId !== input.userId) {
      throw new ForbiddenException('Você não pode cancelar uma solicitação alheia.');
    }
    if (req.status !== 'pending') {
      throw new BadRequestException(
        `Solicitação ${input.requestId} já foi decidida (status=${req.status}).`,
      );
    }
    await this.prisma.membershipRequest.update({
      where: { id: req.id },
      data: { status: 'cancelled', decisionAt: new Date() },
    });
    return { id: req.id };
  }
}
