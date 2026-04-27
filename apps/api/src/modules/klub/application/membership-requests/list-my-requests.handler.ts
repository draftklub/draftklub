import { Injectable } from '@nestjs/common';
import type {
  MembershipRequestForUser,
  MembershipRequestStatus,
} from '@draftklub/shared-types';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListMyRequestsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<MembershipRequestForUser[]> {
    const rows = await this.prisma.membershipRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        klub: { select: { id: true, slug: true, name: true } },
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
      klub: r.klub,
    }));
  }
}
