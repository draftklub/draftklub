import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class ListKlubRequestsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.klubRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
