import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingVisibilityService } from './booking-visibility.service';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_KLUB = '00000000-0000-0000-0000-000000000002';
const VIEWER_ID = '00000000-0000-0000-0001-000000000aaa';
const PRIMARY_ID = '00000000-0000-0000-0001-000000000bbb';
const OTHER_PLAYER_ID = '00000000-0000-0000-0001-000000000ccc';

function makeService(membership: { id: string } | null = null) {
  const prisma = {
    membership: { findFirst: vi.fn().mockResolvedValue(membership) },
  };
  return new BookingVisibilityService(prisma as never);
}

const baseCtx = {
  viewerId: VIEWER_ID,
  bookingKlubId: KLUB_ID,
  bookingPrimaryPlayerId: PRIMARY_ID,
  bookingOtherPlayerIds: [OTHER_PLAYER_ID],
  bookingType: 'player_match',
  spaceSportCode: 'tennis',
};

describe('BookingVisibilityService', () => {
  let svc: BookingVisibilityService;

  beforeEach(() => {
    svc = makeService();
  });

  it('proprio primaryPlayer -> full', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerId: PRIMARY_ID,
      viewerRoles: [],
    });
    expect(r).toBe('full');
  });

  it('proprio otherPlayer -> full', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerId: OTHER_PLAYER_ID,
      viewerRoles: [],
    });
    expect(r).toBe('full');
  });

  it('SUPER_ADMIN -> full', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [{ role: 'SUPER_ADMIN' }],
    });
    expect(r).toBe('full');
  });

  it('KLUB_ADMIN do mesmo Klub -> full', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [{ role: 'KLUB_ADMIN', scopeKlubId: KLUB_ID }],
    });
    expect(r).toBe('full');
  });

  it('KLUB_ADMIN de outro Klub -> limited', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [{ role: 'KLUB_ADMIN', scopeKlubId: OTHER_KLUB }],
    });
    expect(r).toBe('limited');
  });

  it('STAFF do mesmo Klub -> full', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [{ role: 'STAFF', scopeKlubId: KLUB_ID }],
    });
    expect(r).toBe('full');
  });

  it('SPORTS_COMMITTEE da mesma modalidade -> full', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [
        { role: 'SPORTS_COMMITTEE', scopeKlubId: KLUB_ID, scopeSportId: 'tennis' },
      ],
    });
    expect(r).toBe('full');
  });

  it('SPORTS_COMMITTEE de outra modalidade -> limited (sem membership)', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [
        { role: 'SPORTS_COMMITTEE', scopeKlubId: KLUB_ID, scopeSportId: 'squash' },
      ],
    });
    expect(r).toBe('limited');
  });

  it('member ativo do Klub -> full', async () => {
    svc = makeService({ id: 'm-1' });
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('full');
  });

  it('nao-member, sem roles, sem participar -> limited', async () => {
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('limited');
  });
});
