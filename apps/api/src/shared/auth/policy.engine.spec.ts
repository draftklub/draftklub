import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from './policy.engine';
import type { AuthenticatedUser } from './authenticated-user.interface';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  const klubId = 'klub-123';
  const sportId = 'sport-tennis';
  const userId = 'user-abc';

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  it('PLATFORM_OWNER pode qualquer ação', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'admin@test.com',
      roleAssignments: [{ role: 'PLATFORM_OWNER' }],
    };
    expect(engine.can(user, 'tournament.delete', { klubId })).toBe(true);
    expect(engine.can(user, 'user.impersonate', {})).toBe(true);
  });

  it('KLUB_ADMIN pode qualquer ação dentro do seu Klub', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'admin@test.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'tournament.create', { klubId })).toBe(true);
    expect(engine.can(user, 'reservation.cancel', { klubId })).toBe(true);
  });

  it('KLUB_ADMIN não pode agir em Klub diferente', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'admin@test.com',
      roleAssignments: [{ role: 'KLUB_ADMIN', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'tournament.create', { klubId: 'outro-klub' })).toBe(false);
  });

  it('SPORT_COMMISSION pode gerenciar torneios no seu esporte', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'committee@test.com',
      roleAssignments: [{ role: 'SPORT_COMMISSION', scopeKlubId: klubId, scopeSportId: sportId }],
    };
    expect(engine.can(user, 'tournament.create', { klubId, sportId })).toBe(true);
    expect(engine.can(user, 'ranking.update', { klubId, sportId })).toBe(true);
  });

  it('SPORT_COMMISSION não pode gerenciar academy', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'committee@test.com',
      roleAssignments: [{ role: 'SPORT_COMMISSION', scopeKlubId: klubId, scopeSportId: sportId }],
    };
    expect(engine.can(user, 'academy.create', { klubId, sportId })).toBe(false);
  });

  it('PLAYER pode ler qualquer recurso', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'ranking.read', { klubId })).toBe(true);
    expect(engine.can(user, 'tournament.read', { klubId })).toBe(true);
  });

  it('PLAYER não pode deletar torneio de outro usuário', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'tournament.delete', { klubId, ownerId: 'outro-user' })).toBe(false);
  });

  it('PLAYER pode se inscrever e desistir de torneio do próprio Klub', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'tournament.enroll', { klubId })).toBe(true);
    expect(engine.can(user, 'tournament.withdraw', { klubId })).toBe(true);
  });

  it('PLAYER NÃO pode se inscrever em torneio de outro Klub (scope mismatch)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'tournament.enroll', { klubId: 'outro-klub' })).toBe(false);
  });

  it('PLAYER NÃO pode gerenciar torneio (manage/cancel/draw)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'tournament.manage', { klubId })).toBe(false);
    expect(engine.can(user, 'tournament.cancel', { klubId })).toBe(false);
    expect(engine.can(user, 'tournament.draw', { klubId })).toBe(false);
  });

  it('STAFF passa em booking.create quando scopeKlubId bate', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'staff@test.com',
      roleAssignments: [{ role: 'SPORT_STAFF', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'booking.create', { klubId })).toBe(true);
    expect(engine.can(user, 'booking.approve', { klubId })).toBe(true);
    expect(engine.can(user, 'booking.cancel_others', { klubId })).toBe(true);
  });

  it('STAFF NÃO passa em klub.members.add (sem essa permissão)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'staff@test.com',
      roleAssignments: [{ role: 'SPORT_STAFF', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'klub.members.add', { klubId })).toBe(false);
    expect(engine.can(user, 'tournament.manage', { klubId })).toBe(false);
  });

  it('STAFF de Klub A NÃO passa em booking.create com klubId Klub B', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'staff@test.com',
      roleAssignments: [{ role: 'SPORT_STAFF', scopeKlubId: 'klub-A' }],
    };
    expect(engine.can(user, 'booking.create', { klubId: 'klub-B' })).toBe(false);
  });

  it('PLAYER passa em booking.create (membership validado no handler)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'booking.create', { klubId })).toBe(true);
  });

  it('SPORT_COMMISSION passa em booking.approve quando scope só klub (booking não tem sportId)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'committee@test.com',
      roleAssignments: [{ role: 'SPORT_COMMISSION', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'booking.create', { klubId })).toBe(true);
    expect(engine.can(user, 'booking.approve', { klubId })).toBe(true);
  });

  it('PLAYER NÃO passa em booking.approve (operação de staff)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'booking.approve', { klubId })).toBe(false);
    expect(engine.can(user, 'booking.cancel_others', { klubId })).toBe(false);
  });

  it('reservation.create eh legacy removido — sempre retorna false (W2.1)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'player@test.com',
      roleAssignments: [{ role: 'PLAYER', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'reservation.create', { klubId })).toBe(false);
  });

  it('klub.create eh liberado pra qualquer user autenticado (PR3 Onda 1)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'newcomer@test.com',
      roleAssignments: [], // user novo, sem nenhuma role ainda
    };
    expect(engine.can(user, 'klub.create')).toBe(true);
  });

  it('klub.join_via_link eh liberado pra qualquer user autenticado (PR9 Onda 1)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'guest@test.com',
      roleAssignments: [],
    };
    expect(engine.can(user, 'klub.join_via_link')).toBe(true);
  });

  // ─── Sprint Polish PR-J1 ────────────────────────────────────────────

  it('PLATFORM_ADMIN passa em ações gerais', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'pa@test.com',
      roleAssignments: [{ role: 'PLATFORM_ADMIN' }],
    };
    expect(engine.can(user, 'klub.review', {})).toBe(true);
    expect(engine.can(user, 'tournament.delete', { klubId })).toBe(true);
  });

  it('PLATFORM_ADMIN NÃO pode mexer em PLATFORM_OWNER (transferir/demote)', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'pa@test.com',
      roleAssignments: [{ role: 'PLATFORM_ADMIN' }],
    };
    expect(engine.can(user, 'role.demote', { targetRole: 'PLATFORM_OWNER' })).toBe(false);
    expect(engine.can(user, 'role.transfer', { targetRole: 'PLATFORM_OWNER' })).toBe(false);
  });

  it('PLATFORM_ADMIN NÃO pode mexer em outro PLATFORM_ADMIN', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'pa@test.com',
      roleAssignments: [{ role: 'PLATFORM_ADMIN' }],
    };
    expect(engine.can(user, 'role.demote', { targetRole: 'PLATFORM_ADMIN' })).toBe(false);
  });

  it('KLUB_ASSISTANT pode tudo do KLUB_ADMIN no scope', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'ka@test.com',
      roleAssignments: [{ role: 'KLUB_ASSISTANT', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'klub.spaces.create', { klubId })).toBe(true);
    expect(engine.can(user, 'tournament.create', { klubId })).toBe(true);
  });

  it('KLUB_ASSISTANT NÃO pode mexer em role do KLUB_ADMIN', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'ka@test.com',
      roleAssignments: [{ role: 'KLUB_ASSISTANT', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'role.demote', { klubId, targetRole: 'KLUB_ADMIN' })).toBe(false);
    expect(engine.can(user, 'role.transfer', { klubId, targetRole: 'KLUB_ADMIN' })).toBe(false);
  });

  it('KLUB_ASSISTANT pode promover SPORT_STAFF/SPORT_COMMISSION', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'ka@test.com',
      roleAssignments: [{ role: 'KLUB_ASSISTANT', scopeKlubId: klubId }],
    };
    expect(engine.can(user, 'role.grant', { klubId, targetRole: 'SPORT_STAFF' })).toBe(true);
    expect(engine.can(user, 'role.grant', { klubId, targetRole: 'SPORT_COMMISSION' })).toBe(true);
  });
});
