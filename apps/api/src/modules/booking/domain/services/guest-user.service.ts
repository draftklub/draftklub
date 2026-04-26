import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface GuestInput {
  firstName: string;
  lastName: string;
  email: string;
  documentNumber?: string;
  documentType?: string;
  phone?: string;
}

@Injectable()
export class GuestUserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca User por nome (fullName)/email/documentNumber.
   * Retorna até `limit` resultados.
   */
  async search(query: string, limit = 10) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { fullName: { contains: query, mode: 'insensitive' } },
          { documentNumber: query },
        ],
        deletedAt: null,
      },
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        kind: true,
        documentNumber: true,
      },
    });
  }

  /**
   * Cria ou retorna User existente baseado no email.
   * Quando cria, kind='guest' e firebaseUid=null.
   */
  async createOrGet(data: GuestInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) return existing;

    const fullName = `${data.firstName} ${data.lastName}`.trim();

    return this.prisma.user.create({
      data: {
        email: data.email,
        fullName,
        phone: data.phone,
        documentNumber: data.documentNumber,
        documentType: data.documentType,
        kind: 'guest',
        firebaseUid: null,
      },
    });
  }
}
