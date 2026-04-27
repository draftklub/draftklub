import { Injectable } from '@nestjs/common';
import type {
  MembershipRequestAdminItem,
  MembershipRequestStatus,
} from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface ListMembershipRequestsCommand {
  klubId: string;
  status?: MembershipRequestStatus;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * KLUB_ADMIN-only: lista solicitações de entrada de um Klub. Default
 * mostra `pending`. Histórico (approved/rejected) acessível via filtro.
 */
@Injectable()
export class ListMembershipRequestsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ListMembershipRequestsCommand): Promise<MembershipRequestAdminItem[]> {
    const limit = Math.min(cmd.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const status = cmd.status ?? 'pending';

    const rows = await this.prisma.membershipRequest.findMany({
      where: { klubId: cmd.klubId, status },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      klubId: r.klubId,
      userId: r.userId,
      status: r.status as MembershipRequestStatus,
      message: r.message,
      attachmentUrl: r.attachmentUrl,
      decisionAt: r.decisionAt?.toISOString() ?? null,
      decidedById: r.decidedById,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      user: r.user,
    }));
  }
}
