import type { KlubConfig as PrismaKlubConfig } from '@prisma/client';
import type { KlubConfig } from '@draftklub/shared-types';

/**
 * Sprint N batch N-14 — mapper alinhado com KlubConfig shared-types.
 * Antes: shape local KlubConfigResponse omitia `guestsAddedBy` e
 * `tournamentBookingConflictMode` que existem no DB. Agora retorna
 * shape canônico do contrato.
 */
export function mapKlubConfig(config: PrismaKlubConfig | null): KlubConfig | null {
  if (!config) return null;
  return {
    bookingPolicy: config.bookingPolicy,
    accessMode: config.accessMode,
    bookingModes: config.bookingModes as KlubConfig['bookingModes'],
    cancellationMode: config.cancellationMode,
    agendaVisibility: config.agendaVisibility,
    cancellationWindowHours: config.cancellationWindowHours,
    cancellationFeePercent: config.cancellationFeePercent.toString(),
    noShowFeeEnabled: config.noShowFeeEnabled,
    noShowFeeAmount: config.noShowFeeAmount.toString(),
    gatewayAccountId: config.gatewayAccountId,
    openingHour: config.openingHour,
    closingHour: config.closingHour,
    openDays: config.openDays,
    maxRecurrenceMonths: config.maxRecurrenceMonths,
    extensionMode: config.extensionMode,
    guestsAddedBy: config.guestsAddedBy,
    tournamentBookingConflictMode: config.tournamentBookingConflictMode,
  };
}
