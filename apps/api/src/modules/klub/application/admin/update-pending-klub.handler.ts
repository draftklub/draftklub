import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

export interface UpdatePendingKlubCommand {
  klubId: string;
  patch: {
    name?: string;
    slug?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressComplement?: string;
    addressNeighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  };
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Admin ajusta dados do Klub pendente antes de aprovar (slug duplicado,
 * typo no nome, endereço, etc). Restrito a Klubs `reviewStatus='pending'`
 * — Klubs já aprovados/rejeitados editam pelo fluxo normal /klubs/:id
 * (admin do próprio Klub).
 */
@Injectable()
export class UpdatePendingKlubHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: UpdatePendingKlubCommand): Promise<{ id: string; slug: string }> {
    const klub = await this.prisma.klub.findUnique({
      where: { id: cmd.klubId },
      select: { id: true, slug: true, deletedAt: true, review: { select: { reviewStatus: true } } },
    });
    if (!klub || klub.deletedAt) {
      throw new NotFoundException(`Klub ${cmd.klubId} não encontrado`);
    }
    if (klub.review?.reviewStatus !== 'pending') {
      throw new BadRequestException(
        `Klub ${cmd.klubId} já foi decidido (status=${klub.review?.reviewStatus}); use o fluxo normal de edição.`,
      );
    }

    const data: Record<string, unknown> = {};
    const contactData: Record<string, unknown> = {};
    if (cmd.patch.name !== undefined) data.name = cmd.patch.name;
    if (cmd.patch.addressStreet !== undefined) contactData.addressStreet = cmd.patch.addressStreet;
    if (cmd.patch.addressNumber !== undefined) contactData.addressNumber = cmd.patch.addressNumber;
    if (cmd.patch.addressComplement !== undefined)
      contactData.addressComplement = cmd.patch.addressComplement;
    if (cmd.patch.addressNeighborhood !== undefined)
      contactData.addressNeighborhood = cmd.patch.addressNeighborhood;
    if (cmd.patch.city !== undefined) contactData.city = cmd.patch.city;
    if (cmd.patch.state !== undefined) contactData.state = cmd.patch.state;
    if (cmd.patch.cep !== undefined) contactData.cep = cmd.patch.cep;

    if (cmd.patch.slug !== undefined && cmd.patch.slug !== klub.slug) {
      if (!SLUG_REGEX.test(cmd.patch.slug)) {
        throw new BadRequestException('Slug deve ser kebab-case (lowercase + hífens).');
      }
      const conflict = await this.prisma.klub.findFirst({
        where: {
          slug: cmd.patch.slug,
          deletedAt: null,
          id: { not: cmd.klubId },
        },
        select: { id: true, name: true },
      });
      if (conflict) {
        throw new ConflictException({
          type: 'slug_unavailable',
          message: `Slug "${cmd.patch.slug}" já está em uso por "${conflict.name}".`,
        });
      }
      data.slug = cmd.patch.slug;
    }

    let updated: { id: string; slug: string } | undefined;
    if (Object.keys(data).length > 0) {
      updated = await this.prisma.klub.update({
        where: { id: cmd.klubId },
        data,
        select: { id: true, slug: true },
      });
    }
    if (Object.keys(contactData).length > 0) {
      await this.prisma.klubContact.upsert({
        where: { klubId: cmd.klubId },
        update: contactData,
        create: { klubId: cmd.klubId, ...contactData },
      });
    }
    return updated ?? { id: cmd.klubId, slug: klub.slug };
  }
}
