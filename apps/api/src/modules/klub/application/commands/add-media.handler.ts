import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { AddMediaDto } from '../../api/dtos/add-media.dto';

@Injectable()
export class AddMediaHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(klubId: string, data: AddMediaDto) {
    return this.prisma.klubMedia.create({
      data: { klubId, ...data },
    });
  }
}
