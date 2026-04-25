import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { GetKlubBySlugHandler } from './get-klub-by-slug.handler';

describe('GetKlubBySlugHandler', () => {
  it('expoe todos os campos de config (mesmos do get-by-id)', async () => {
    const klub = {
      id: 'klub-1',
      name: 'Tennis',
      slug: 'tennis',
      type: 'sports_club',
      plan: 'trial',
      status: 'trial',
      city: 'Rio',
      state: 'RJ',
      timezone: 'America/Sao_Paulo',
      email: null,
      phone: null,
      documentHint: null,
      legalName: null,
      isGroup: false,
      parentKlubId: null,
      sportProfiles: [],
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
        extensionMode: 'staff_approval',
      },
    };
    const klubRepo = { findBySlug: vi.fn().mockResolvedValue(klub) };
    const handler = new GetKlubBySlugHandler(klubRepo as never);

    const result = await handler.execute('tennis');

    expect(result.config?.accessMode).toBe('members_only');
    expect(result.config?.bookingModes).toEqual(['direct']);
    expect(result.config?.extensionMode).toBe('staff_approval');
    expect(result.config?.maxRecurrenceMonths).toBe(3);
    expect(result.config?.agendaVisibility).toBe('public');
    expect(result.config?.cancellationMode).toBe('with_deadline');
  });
});
