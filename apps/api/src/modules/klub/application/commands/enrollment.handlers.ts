import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface RequestEnrollmentCommand {
  userId: string;
  klubId: string;
  sportCode: string;
}

export interface ApproveEnrollmentCommand {
  enrollmentId: string;
  approvedById: string;
}

export interface RejectEnrollmentCommand {
  enrollmentId: string;
  rejectedById: string;
  reason?: string;
}

export interface CreateEnrollmentDirectCommand {
  userId: string;
  klubId: string;
  sportCode: string;
  approvedById: string;
}

export interface SuspendEnrollmentCommand {
  enrollmentId: string;
  suspendedById: string;
  reason?: string;
}

export interface ReactivateEnrollmentCommand {
  enrollmentId: string;
  approvedById: string;
}

export interface CancelEnrollmentCommand {
  enrollmentId: string;
  cancelledById: string;
}

async function resolveSportProfile(prisma: PrismaService, klubId: string, sportCode: string) {
  const profile = await prisma.klubSportProfile.findFirst({
    where: { klubId, sportCode },
    select: { id: true, status: true },
  });
  if (!profile) {
    throw new NotFoundException(`Sport profile not found for klub=${klubId} sport=${sportCode}`);
  }
  if (profile.status !== 'active') {
    throw new BadRequestException(`Sport profile is not active`);
  }
  return profile;
}

async function ensureKlubMembership(prisma: PrismaService, userId: string, klubId: string) {
  const m = await prisma.membership.findFirst({
    where: { userId, klubId, status: 'active' },
    select: { id: true },
  });
  if (!m) {
    throw new ForbiddenException('User must be an active member of the Klub before enrollment');
  }
}

@Injectable()
export class RequestEnrollmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: RequestEnrollmentCommand) {
    const profile = await resolveSportProfile(this.prisma, cmd.klubId, cmd.sportCode);
    await ensureKlubMembership(this.prisma, cmd.userId, cmd.klubId);

    const existing = await this.prisma.playerSportEnrollment.findUnique({
      where: {
        userId_klubSportProfileId: { userId: cmd.userId, klubSportProfileId: profile.id },
      },
    });
    if (existing && (existing.status === 'pending' || existing.status === 'active')) {
      throw new BadRequestException(`Enrollment already exists with status '${existing.status}'`);
    }

    if (existing) {
      // resuscitate cancelled/suspended -> back to pending
      return this.prisma.playerSportEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          enrolledAt: new Date(),
          approvedAt: null,
          approvedById: null,
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
          cancelledAt: null,
          cancelledById: null,
        },
      });
    }

    return this.prisma.playerSportEnrollment.create({
      data: {
        userId: cmd.userId,
        klubSportProfileId: profile.id,
        status: 'pending',
      },
    });
  }
}

@Injectable()
export class ApproveEnrollmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ApproveEnrollmentCommand) {
    const enrollment = await this.prisma.playerSportEnrollment.findUnique({
      where: { id: cmd.enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== 'pending') {
      throw new BadRequestException(`Enrollment in status '${enrollment.status}', cannot approve`);
    }
    return this.prisma.playerSportEnrollment.update({
      where: { id: cmd.enrollmentId },
      data: {
        status: 'active',
        approvedById: cmd.approvedById,
        approvedAt: new Date(),
      },
    });
  }
}

@Injectable()
export class RejectEnrollmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: RejectEnrollmentCommand) {
    const enrollment = await this.prisma.playerSportEnrollment.findUnique({
      where: { id: cmd.enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== 'pending') {
      throw new BadRequestException(`Enrollment in status '${enrollment.status}', cannot reject`);
    }
    return this.prisma.playerSportEnrollment.update({
      where: { id: cmd.enrollmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledById: cmd.rejectedById,
        suspensionReason: cmd.reason,
      },
    });
  }
}

@Injectable()
export class CreateEnrollmentDirectHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CreateEnrollmentDirectCommand) {
    const profile = await resolveSportProfile(this.prisma, cmd.klubId, cmd.sportCode);
    await ensureKlubMembership(this.prisma, cmd.userId, cmd.klubId);

    const existing = await this.prisma.playerSportEnrollment.findUnique({
      where: {
        userId_klubSportProfileId: { userId: cmd.userId, klubSportProfileId: profile.id },
      },
    });
    if (existing?.status === 'active') {
      throw new BadRequestException('Enrollment is already active');
    }

    if (existing) {
      return this.prisma.playerSportEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          approvedById: cmd.approvedById,
          approvedAt: new Date(),
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
          cancelledAt: null,
          cancelledById: null,
        },
      });
    }

    return this.prisma.playerSportEnrollment.create({
      data: {
        userId: cmd.userId,
        klubSportProfileId: profile.id,
        status: 'active',
        approvedById: cmd.approvedById,
        approvedAt: new Date(),
      },
    });
  }
}

@Injectable()
export class SuspendEnrollmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: SuspendEnrollmentCommand) {
    const enrollment = await this.prisma.playerSportEnrollment.findUnique({
      where: { id: cmd.enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== 'active') {
      throw new BadRequestException(
        `Only active enrollments can be suspended (status='${enrollment.status}')`,
      );
    }
    return this.prisma.playerSportEnrollment.update({
      where: { id: cmd.enrollmentId },
      data: {
        status: 'suspended',
        suspendedAt: new Date(),
        suspendedById: cmd.suspendedById,
        suspensionReason: cmd.reason,
      },
    });
  }
}

@Injectable()
export class ReactivateEnrollmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: ReactivateEnrollmentCommand) {
    const enrollment = await this.prisma.playerSportEnrollment.findUnique({
      where: { id: cmd.enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== 'suspended') {
      throw new BadRequestException(
        `Only suspended enrollments can be reactivated (status='${enrollment.status}')`,
      );
    }
    return this.prisma.playerSportEnrollment.update({
      where: { id: cmd.enrollmentId },
      data: {
        status: 'active',
        approvedById: cmd.approvedById,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendedById: null,
        suspensionReason: null,
      },
    });
  }
}

@Injectable()
export class CancelEnrollmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: CancelEnrollmentCommand) {
    const enrollment = await this.prisma.playerSportEnrollment.findUnique({
      where: { id: cmd.enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status === 'cancelled') {
      throw new BadRequestException('Enrollment is already cancelled');
    }
    return this.prisma.playerSportEnrollment.update({
      where: { id: cmd.enrollmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledById: cmd.cancelledById,
      },
    });
  }
}
