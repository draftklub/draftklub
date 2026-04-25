import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface AddMemberCommand {
  klubId: string;
  userId: string;
  type: string;
  role?: string;
}

@Injectable()
export class AddMemberHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: AddMemberCommand) {
    const role = cmd.role ?? 'PLAYER';

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findUnique({
        where: { userId_klubId: { userId: cmd.userId, klubId: cmd.klubId } },
      });

      const membership = existing
        ? existing.status !== 'active'
          ? await tx.membership.update({
              where: { id: existing.id },
              data: { status: 'active', type: cmd.type },
            })
          : existing
        : await tx.membership.create({
            data: {
              userId: cmd.userId,
              klubId: cmd.klubId,
              type: cmd.type,
              status: 'active',
            },
          });

      const existingRole = await tx.roleAssignment.findFirst({
        where: { userId: cmd.userId, scopeKlubId: cmd.klubId, role },
      });

      if (!existingRole) {
        await tx.roleAssignment.create({
          data: {
            userId: cmd.userId,
            role,
            scopeKlubId: cmd.klubId,
            scopeSportId: null,
          },
        });
      }

      return membership;
    });
  }
}
