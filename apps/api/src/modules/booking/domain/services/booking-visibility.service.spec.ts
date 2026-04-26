import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingVisibilityService } from './booking-visibility.service';

const KLUB_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_KLUB = '00000000-0000-0000-0000-000000000002';
const VIEWER_ID = '00000000-0000-0000-0001-000000000aaa';
const PRIMARY_ID = '00000000-0000-0000-0001-000000000bbb';
const OTHER_PLAYER_ID = '00000000-0000-0000-0001-000000000ccc';
const PROFILE_ID = '00000000-0000-0000-0010-000000000001';

function makeService(opts: {
  enrollment?: { status: string } | null;
  hasProfile?: boolean;
} = {}) {
  const profileFindFirst = vi
    .fn()
    .mockResolvedValue(opts.hasProfile === false ? null : { id: PROFILE_ID });
  const enrollmentFindUnique = vi.fn().mockResolvedValue(opts.enrollment ?? null);

  const prisma = {
    klubSportProfile: { findFirst: profileFindFirst },
    playerSportEnrollment: { findUnique: enrollmentFindUnique },
  };
  return {
    svc: new BookingVisibilityService(prisma as never),
    spies: { profileFindFirst, enrollmentFindUnique },
  };
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
    svc = makeService().svc;
  });

  it('proprio primaryPlayer -> full', async () => {
    const r = await svc.resolve({ ...baseCtx, viewerId: PRIMARY_ID, viewerRoles: [] });
    expect(r).toBe('full');
  });

  it('proprio otherPlayer -> full', async () => {
    const r = await svc.resolve({ ...baseCtx, viewerId: OTHER_PLAYER_ID, viewerRoles: [] });
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

  it('KLUB_ADMIN de outro Klub -> limited (sem enrollment ativo)', async () => {
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

  it('SPORTS_COMMITTEE de outra modalidade -> limited (sem enrollment)', async () => {
    const r = await svc.resolve({
      ...baseCtx,
      viewerRoles: [
        { role: 'SPORTS_COMMITTEE', scopeKlubId: KLUB_ID, scopeSportId: 'squash' },
      ],
    });
    expect(r).toBe('limited');
  });

  // ─── Cenários novos do W2.3: PlayerSportEnrollment ────────
  it('W2.3: enrollment active na modalidade -> full', async () => {
    svc = makeService({ enrollment: { status: 'active' } }).svc;
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('full');
  });

  it('W2.3: enrollment suspended -> limited', async () => {
    svc = makeService({ enrollment: { status: 'suspended' } }).svc;
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('limited');
  });

  it('W2.3: enrollment cancelled -> limited', async () => {
    svc = makeService({ enrollment: { status: 'cancelled' } }).svc;
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('limited');
  });

  it('W2.3: sem enrollment (e nao-participante / sem role) -> limited', async () => {
    svc = makeService({ enrollment: null }).svc;
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('limited');
  });

  it('W2.3: enrollment pending NAO da full', async () => {
    svc = makeService({ enrollment: { status: 'pending' } }).svc;
    const r = await svc.resolve({ ...baseCtx, viewerRoles: [] });
    expect(r).toBe('limited');
  });
});
