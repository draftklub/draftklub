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

  it('SUPER_ADMIN pode qualquer ação', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'admin@test.com',
      roleAssignments: [{ role: 'SUPER_ADMIN' }],
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

  it('SPORTS_COMMITTEE pode gerenciar torneios no seu esporte', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'committee@test.com',
      roleAssignments: [{ role: 'SPORTS_COMMITTEE', scopeKlubId: klubId, scopeSportId: sportId }],
    };
    expect(engine.can(user, 'tournament.create', { klubId, sportId })).toBe(true);
    expect(engine.can(user, 'ranking.update', { klubId, sportId })).toBe(true);
  });

  it('SPORTS_COMMITTEE não pode gerenciar academy', () => {
    const user: AuthenticatedUser = {
      userId,
      firebaseUid: 'firebase-uid',
      email: 'committee@test.com',
      roleAssignments: [{ role: 'SPORTS_COMMITTEE', scopeKlubId: klubId, scopeSportId: sportId }],
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
});
