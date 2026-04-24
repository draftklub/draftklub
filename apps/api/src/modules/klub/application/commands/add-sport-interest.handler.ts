import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class AddSportInterestHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubId: string, sportName: string) {
    return this.prisma.klubSportInterest.create({
      data: { klubId, sportName },
    });
  }
}
