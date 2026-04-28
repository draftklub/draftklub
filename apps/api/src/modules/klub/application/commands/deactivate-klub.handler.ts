import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface DeactivateKlubCommand {
  klubId: string;
  decidedById: string;
  reason?: string;
}

/**
 * Sprint Polish PR-F — desativa Klub via soft delete (`deletedAt` +
 * `status='suspended'`). SUPER_ADMIN-only por enquanto; regras de
 * negócio futuras (e.g. churn por inadimplência) podem chamar este
 * mesmo handler com decidedById de service account.
 *
 * Idempotente: chamar 2x é no-op (já tem deletedAt). Não emite outbox
 * event ainda — fluxo de notificação pra members e KLUB_ADMIN fica
 * pra PR posterior.
 */
@Injectable()
export class DeactivateKlubHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: DeactivateKlubCommand) {
    const klub = await this.prisma.klub.findUnique({ where: { id: cmd.klubId } });
    if (!klub) throw new NotFoundException('Klub não encontrado');
    if (klub.deletedAt) return klub; // idempotente

    return this.prisma.klub.update({
      where: { id: cmd.klubId },
      data: {
        deletedAt: new Date(),
        status: 'suspended',
      },
    });
  }
}
