import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface AddMemberCommand {
  klubId: string;
  userId: string;
  type: string;
}

@Injectable()
export class AddMemberHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: AddMemberCommand) {
    const existing = await this.prisma.membership.findUnique({
      where: { userId_klubId: { userId: cmd.userId, klubId: cmd.klubId } },
    });

    if (existing) {
      if (existing.status !== 'active') {
        return this.prisma.membership.update({
          where: { id: existing.id },
          data: { status: 'active', type: cmd.type },
        });
      }
      return existing;
    }

    return this.prisma.membership.create({
      data: {
        userId: cmd.userId,
        klubId: cmd.klubId,
        type: cmd.type,
        status: 'active',
      },
    });
  }
}
