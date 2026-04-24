import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { CreateKlubRequestDto } from '../../api/dtos/create-klub-request.dto';

@Injectable()
export class CreateKlubRequestHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateKlubRequestDto) {
    return this.prisma.klubRequest.create({
      data: {
        name: dto.name,
        type: dto.type,
        city: dto.city,
        state: dto.state,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        sportCodes: dto.sportCodes,
        estimatedMembers: dto.estimatedMembers,
        message: dto.message,
      },
    });
  }
}
