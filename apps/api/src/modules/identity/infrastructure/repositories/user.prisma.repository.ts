import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { UserProps } from '../../domain/user.entity';

export interface UserWithRoles extends UserProps {
  roleAssignments: {
    id: string;
    role: string;
    scopeKlubId: string | null;
    scopeSportId: string | null;
    grantedAt: Date;
    grantedBy: string | null;
  }[];
}

@Injectable()
export class UserPrismaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByFirebaseUid(firebaseUid: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
      include: { roleAssignments: true },
    });
  }

  async findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roleAssignments: true },
    });
  }

  async upsert(data: {
    firebaseUid: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  }): Promise<UserWithRoles> {
    return this.prisma.user.upsert({
      where: { firebaseUid: data.firebaseUid },
      create: {
        firebaseUid: data.firebaseUid,
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
      },
      update: {
        email: data.email,
        fullName: data.fullName,
        avatarUrl: data.avatarUrl ?? undefined,
      },
      include: { roleAssignments: true },
    });
  }
}
