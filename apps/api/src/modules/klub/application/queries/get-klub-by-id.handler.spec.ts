import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { GetKlubByIdHandler } from './get-klub-by-id.handler';

const EXPECTED_CONFIG_KEYS = [
  'bookingPolicy',
  'accessMode',
  'bookingModes',
  'cancellationMode',
  'agendaVisibility',
  'cancellationWindowHours',
  'cancellationFeePercent',
  'noShowFeeEnabled',
  'noShowFeeAmount',
  'gatewayAccountId',
  'openingHour',
  'closingHour',
  'openDays',
  'maxRecurrenceMonths',
  'extensionMode',
  // Sprint N batch N-14 — mapper agora expõe campos que estavam no
  // shared-types KlubConfig mas faltavam no response.
  'guestsAddedBy',
  'tournamentBookingConflictMode',
];

function fakeKlub() {
  return {
    id: 'klub-1',
    name: 'Tennis',
    slug: 'tennis',
    type: 'sports_club',
    plan: 'trial',
    status: 'trial',
    city: 'Rio',
    state: 'RJ',
    timezone: 'America/Sao_Paulo',
    email: 'a@b.com',
    phone: '+55',
    documentHint: null,
    legalName: null,
    isGroup: false,
    parentKlubId: null,
    sportProfiles: [{ sportCode: 'tennis' }],
    createdAt: new Date(),
    config: {
      id: 'cfg-1',
      klubId: 'klub-1',
      bookingPolicy: 'members_only',
      accessMode: 'members_only',
      bookingModes: ['direct'],
      cancellationMode: 'with_deadline',
      agendaVisibility: 'public',
      cancellationWindowHours: 24,
      cancellationFeePercent: new Prisma.Decimal('0'),
      noShowFeeEnabled: false,
      noShowFeeAmount: new Prisma.Decimal('0'),
      gatewayAccountId: null,
      openingHour: 7,
      closingHour: 22,
      openDays: '1,2,3,4,5,6,7',
      maxRecurrenceMonths: 3,
      extensionMode: 'player',
    },
  };
}

describe('GetKlubByIdHandler', () => {
  it('expoe todos os campos de config no response', async () => {
    const klubRepo = {
      findById: vi.fn().mockResolvedValue(fakeKlub()),
    };
    const handler = new GetKlubByIdHandler(klubRepo as never);

    const result = await handler.execute('klub-1');

    expect(result.config).not.toBeNull();
    expect(Object.keys(result.config ?? {}).sort()).toEqual([...EXPECTED_CONFIG_KEYS].sort());
    expect(result.config?.extensionMode).toBe('player');
  });

  it('retorna config null quando klub nao tem config', async () => {
    const klub = { ...fakeKlub(), config: null };
    const klubRepo = { findById: vi.fn().mockResolvedValue(klub) };
    const handler = new GetKlubByIdHandler(klubRepo as never);

    const result = await handler.execute('klub-1');
    expect(result.config).toBeNull();
  });
});
