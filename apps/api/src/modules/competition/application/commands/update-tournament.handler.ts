import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import type { UpdateTournamentDto } from '../../api/dtos/update-tournament.dto';

export interface UpdateTournamentCommand {
  tournamentId: string;
  updatedById: string;
  patch: UpdateTournamentDto;
}

/**
 * Sprint K PR-K5a — edita campos básicos do torneio pós-create.
 *
 * Não permite alterar format/ranking/categories/prequalifier-config — esses
 * exigem recriar bracket. Datas devem manter ordem temporal:
 * registrationOpensAt < registrationClosesAt ≤ drawDate ≤ mainStartDate ≤ mainEndDate.
 * Prequalifier dates só validadas quando hasPrequalifiers=true.
 *
 * Bloqueado se torneio já cancelado/finalizado (correção via SQL/admin).
 */
@Injectable()
export class UpdateTournamentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(cmd: UpdateTournamentCommand): Promise<{ id: string }> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: cmd.tournamentId },
      select: {
        id: true,
        status: true,
        hasPrequalifiers: true,
        registrationOpensAt: true,
        registrationClosesAt: true,
        drawDate: true,
        prequalifierStartDate: true,
        prequalifierEndDate: true,
        mainStartDate: true,
        mainEndDate: true,
      },
    });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${cmd.tournamentId} not found`);
    }
    if (tournament.status === 'cancelled' || tournament.status === 'finished') {
      throw new BadRequestException(
        `Tournament ${cmd.tournamentId} já está ${tournament.status}; edição bloqueada.`,
      );
    }

    // Merge patch sobre estado atual pra validar consistência temporal.
    const merged = {
      registrationOpensAt: cmd.patch.registrationOpensAt ?? tournament.registrationOpensAt,
      registrationClosesAt: cmd.patch.registrationClosesAt ?? tournament.registrationClosesAt,
      drawDate: cmd.patch.drawDate ?? tournament.drawDate,
      prequalifierStartDate:
        cmd.patch.prequalifierStartDate !== undefined
          ? cmd.patch.prequalifierStartDate
          : tournament.prequalifierStartDate,
      prequalifierEndDate:
        cmd.patch.prequalifierEndDate !== undefined
          ? cmd.patch.prequalifierEndDate
          : tournament.prequalifierEndDate,
      mainStartDate: cmd.patch.mainStartDate ?? tournament.mainStartDate,
      mainEndDate:
        cmd.patch.mainEndDate !== undefined ? cmd.patch.mainEndDate : tournament.mainEndDate,
    };

    if (merged.registrationOpensAt >= merged.registrationClosesAt) {
      throw new BadRequestException('registrationOpensAt deve ser antes de registrationClosesAt.');
    }
    if (merged.registrationClosesAt > merged.drawDate) {
      throw new BadRequestException('registrationClosesAt deve ser ≤ drawDate.');
    }
    if (merged.drawDate > merged.mainStartDate) {
      throw new BadRequestException('drawDate deve ser ≤ mainStartDate.');
    }
    if (merged.mainEndDate && merged.mainStartDate > merged.mainEndDate) {
      throw new BadRequestException('mainStartDate deve ser ≤ mainEndDate.');
    }
    if (tournament.hasPrequalifiers) {
      if (!merged.prequalifierStartDate || !merged.prequalifierEndDate) {
        throw new BadRequestException(
          'Tournament tem prequalifier — datas de pré-qualificatória obrigatórias.',
        );
      }
      if (merged.prequalifierStartDate > merged.prequalifierEndDate) {
        throw new BadRequestException('prequalifierStartDate deve ser ≤ prequalifierEndDate.');
      }
      if (merged.prequalifierEndDate > merged.mainStartDate) {
        throw new BadRequestException('prequalifierEndDate deve ser ≤ mainStartDate.');
      }
    }

    // Build prisma data: só inclui campos presentes em patch.
    const data: Record<string, unknown> = {};
    if (cmd.patch.name !== undefined) data.name = cmd.patch.name;
    if (cmd.patch.description !== undefined) data.description = cmd.patch.description;
    if (cmd.patch.coverUrl !== undefined) data.coverUrl = cmd.patch.coverUrl;
    if (cmd.patch.registrationApproval !== undefined)
      data.registrationApproval = cmd.patch.registrationApproval;
    if (cmd.patch.registrationFee !== undefined) data.registrationFee = cmd.patch.registrationFee;
    if (cmd.patch.registrationOpensAt !== undefined)
      data.registrationOpensAt = cmd.patch.registrationOpensAt;
    if (cmd.patch.registrationClosesAt !== undefined)
      data.registrationClosesAt = cmd.patch.registrationClosesAt;
    if (cmd.patch.drawDate !== undefined) data.drawDate = cmd.patch.drawDate;
    if (cmd.patch.prequalifierStartDate !== undefined)
      data.prequalifierStartDate = cmd.patch.prequalifierStartDate;
    if (cmd.patch.prequalifierEndDate !== undefined)
      data.prequalifierEndDate = cmd.patch.prequalifierEndDate;
    if (cmd.patch.mainStartDate !== undefined) data.mainStartDate = cmd.patch.mainStartDate;
    if (cmd.patch.mainEndDate !== undefined) data.mainEndDate = cmd.patch.mainEndDate;

    const updated = await this.prisma.tournament.update({
      where: { id: cmd.tournamentId },
      data,
      select: { id: true },
    });

    return { id: updated.id };
  }
}
