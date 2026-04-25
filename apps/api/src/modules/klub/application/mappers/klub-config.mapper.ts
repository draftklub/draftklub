import type { KlubConfig } from '@prisma/client';

export interface KlubConfigResponse {
  bookingPolicy: string;
  accessMode: string;
  bookingModes: unknown;
  cancellationMode: string;
  agendaVisibility: string;
  cancellationWindowHours: number;
  cancellationFeePercent: string;
  noShowFeeEnabled: boolean;
  noShowFeeAmount: string;
  gatewayAccountId: string | null;
  openingHour: number;
  closingHour: number;
  openDays: string;
  maxRecurrenceMonths: number;
  extensionMode: string;
}

export function mapKlubConfig(config: KlubConfig | null): KlubConfigResponse | null {
  if (!config) return null;
  return {
    bookingPolicy: config.bookingPolicy,
    accessMode: config.accessMode,
    bookingModes: config.bookingModes,
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
  };
}
