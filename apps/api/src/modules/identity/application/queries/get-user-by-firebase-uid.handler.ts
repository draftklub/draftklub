import { Injectable, NotFoundException } from '@nestjs/common';
import { UserPrismaRepository } from '../../infrastructure/repositories/user.prisma.repository';
import type { SyncUserResult } from '../commands/sync-user.handler';

@Injectable()
export class GetUserByFirebaseUidHandler {
  constructor(private readonly userRepo: UserPrismaRepository) {}

  async execute(firebaseUid: string): Promise<SyncUserResult> {
    const user = await this.userRepo.findByFirebaseUid(firebaseUid);

    if (!user) {
      throw new NotFoundException(`User not found for firebaseUid: ${firebaseUid}`);
    }

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
