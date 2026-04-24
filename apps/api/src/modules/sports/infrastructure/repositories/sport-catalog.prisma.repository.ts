import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class SportCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(onlyActive = true) {
    return this.prisma.sportCatalog.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findByCode(code: string) {
    return this.prisma.sportCatalog.findUnique({ where: { code } });
  }
}
