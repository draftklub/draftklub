import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { mapKlubConfig } from './klub-config.mapper';

describe('mapKlubConfig', () => {
  it('retorna null quando config eh null', () => {
    expect(mapKlubConfig(null)).toBeNull();
  });

  it('expoe todos os campos esperados pelo cliente', () => {
    const config = {
      id: 'cfg-1',
      klubId: 'klub-1',
      bookingPolicy: 'members_only',
      accessMode: 'members_only',
      bookingModes: ['direct', 'staff_approval'],
      cancellationMode: 'with_deadline',
      agendaVisibility: 'public',
      cancellationWindowHours: 24,
      cancellationFeePercent: new Prisma.Decimal('10.00'),
      noShowFeeEnabled: true,
      noShowFeeAmount: new Prisma.Decimal('50.00'),
      gatewayAccountId: 'gw-123',
      openingHour: 7,
      closingHour: 22,
      openDays: '1,2,3,4,5,6,7',
      maxRecurrenceMonths: 3,
      extensionMode: 'player',
    } as unknown as Parameters<typeof mapKlubConfig>[0];

    const result = mapKlubConfig(config);

    expect(result).toEqual({
      bookingPolicy: 'members_only',
      accessMode: 'members_only',
      bookingModes: ['direct', 'staff_approval'],
      cancellationMode: 'with_deadline',
      agendaVisibility: 'public',
      cancellationWindowHours: 24,
      cancellationFeePercent: '10',
      noShowFeeEnabled: true,
      noShowFeeAmount: '50',
      gatewayAccountId: 'gw-123',
      openingHour: 7,
      closingHour: 22,
      openDays: '1,2,3,4,5,6,7',
      maxRecurrenceMonths: 3,
      extensionMode: 'player',
    });
  });
});
