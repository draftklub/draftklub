import { Injectable } from '@nestjs/common';
import { UserPrismaRepository } from '../../infrastructure/repositories/user.prisma.repository';

export interface SyncUserCommand {
  firebaseUid: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface SyncUserResult {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  roleAssignments: {
    role: string;
    scopeKlubId: string | null;
    scopeSportId: string | null;
  }[];
}

@Injectable()
export class SyncUserHandler {
  constructor(private readonly userRepo: UserPrismaRepository) {}

  async execute(cmd: SyncUserCommand): Promise<SyncUserResult> {
    const user = await this.userRepo.upsert({
      firebaseUid: cmd.firebaseUid,
      email: cmd.email,
      fullName: cmd.fullName,
      avatarUrl: cmd.avatarUrl,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? null,
      roleAssignments: user.roleAssignments.map((r) => ({
        role: r.role,
        scopeKlubId: r.scopeKlubId,
        scopeSportId: r.scopeSportId,
      })),
    };
  }
}
