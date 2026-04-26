/**
 * @draftklub/shared-types
 *
 * Tipos compartilhados entre `apps/api` (NestJS + Prisma) e `apps/web`
 * (Next.js). Source of truth pra response shapes da API.
 *
 * Convenções:
 * - Datas vão como `string` (ISO 8601). Frontend converte com `new Date()`.
 * - Decimais vão como `string` (preserva precisão; nunca como `number`).
 * - JSON columns são tipadas explicitamente quando o shape é conhecido,
 *   senão `Record<string, unknown>` ou `unknown[]`.
 * - Enums são string unions (`type X = 'a' | 'b'`), não TS `enum`.
 * - Sem leak de Prisma internals (Prisma.Decimal, Prisma.JsonValue).
 */

// ─── Enums (string unions) ──────────────────────────────────────────────

export type Role =
  | 'SUPER_ADMIN'
  | 'KLUB_ADMIN'
  | 'SPORTS_COMMITTEE'
  | 'STAFF'
  | 'TEACHER'
  | 'PLAYER';

export type UserKind = 'regular' | 'guest';

export type DocumentType = 'cpf' | 'rg' | 'passport' | 'other';

export type MembershipType = 'member' | 'guest' | 'staff';

export type MembershipStatus = 'active' | 'inactive' | 'suspended';

export type KlubType =
  | 'sports_club'
  | 'condo'
  | 'school'
  | 'public_space'
  | 'academy'
  | 'individual';

export type KlubPlan = 'trial' | 'starter' | 'pro' | 'elite' | 'enterprise';

export type KlubStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export type AccessMode = 'public' | 'members_only';

export type BookingMode = 'direct' | 'staff_approval' | 'staff_only';

export type CancellationMode = 'free' | 'with_deadline' | 'staff_only';

export type AgendaVisibility = 'public' | 'private';

export type ExtensionMode =
  | 'disabled'
  | 'player'
  | 'staff_approval'
  | 'staff_only';

export type GuestsAddedBy = 'player' | 'staff' | 'both';

export type TournamentBookingConflictMode =
  | 'block_avulso'
  | 'auto_cancel_avulso'
  | 'staff_decides';

export type SportProfileStatus = 'active' | 'inactive';

export type EnrollmentStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'cancelled';

// ─── User ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  firebaseUid: string | null;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  kind: UserKind;
  documentNumber: string | null;
  documentType: DocumentType | null;
  createdAt: string;
}

export interface RoleAssignment {
  /** Role do user no escopo. */
  role: Role;
  /**
   * Klub do escopo. `null`/ausente apenas pra SUPER_ADMIN global. Na wire
   * JSON pode vir `null` ou ser omitido — `JSON.stringify` drop `undefined`.
   */
  scopeKlubId?: string | null;
  /** Modalidade do escopo (apenas pra SPORTS_COMMITTEE). */
  scopeSportId?: string | null;
}

/**
 * Resposta de `GET /me`. Identidade mínima do user logado + roles.
 *
 * Não inclui memberships — pra isso usar `GET /me/klubs` (Onda 1 PR3).
 */
export interface MeResponse {
  id: string;
  email: string;
  firebaseUid: string | null;
  roleAssignments: RoleAssignment[];
}

// ─── Klub ───────────────────────────────────────────────────────────────

export interface Klub {
  id: string;
  name: string;
  slug: string;
  type: KlubType;
  plan: KlubPlan;
  status: KlubStatus;
  city: string | null;
  state: string | null;
  timezone: string;
  email: string | null;
  phone: string | null;
  documentHint: string | null;
  legalName: string | null;
  parentKlubId: string | null;
  isGroup: boolean;
  /** Códigos de modalidade habilitadas (lista direta — atalho da relação `sportProfiles`). */
  sports: string[];
  config: KlubConfig | null;
  createdAt: string;
}

export interface KlubConfig {
  bookingPolicy: string; // legacy (backward compat)
  accessMode: AccessMode;
  bookingModes: BookingMode[];
  cancellationMode: CancellationMode;
  agendaVisibility: AgendaVisibility;
  cancellationWindowHours: number;
  cancellationFeePercent: string; // Decimal serializado
  noShowFeeEnabled: boolean;
  noShowFeeAmount: string; // Decimal serializado
  gatewayAccountId: string | null;
  openingHour: number;
  closingHour: number;
  openDays: string; // CSV "1,2,3,4,5,6,7"
  maxRecurrenceMonths: number;
  extensionMode: ExtensionMode;
  guestsAddedBy: GuestsAddedBy;
  tournamentBookingConflictMode: TournamentBookingConflictMode;
}

export interface KlubSportProfile {
  id: string;
  klubId: string;
  sportCode: string;
  name: string | null;
  description: string | null;
  coverUrl: string | null;
  defaultRatingEngine: string;
  defaultInitialRating: number;
  status: SportProfileStatus;
  addedAt: string;
}

// ─── Membership ─────────────────────────────────────────────────────────

export interface Membership {
  id: string;
  userId: string;
  klubId: string;
  type: MembershipType;
  status: MembershipStatus;
  joinedAt: string;
  expiresAt: string | null;
}

/**
 * Item retornado por `GET /me/klubs` (planejado pra PR3 da Onda 1).
 * Junta Membership com info básica do Klub + role do user nesse Klub
 * (deduzido de RoleAssignment).
 */
export interface UserKlubMembership {
  klubId: string;
  klubSlug: string;
  klubName: string;
  klubPlan: KlubPlan;
  klubStatus: KlubStatus;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  /** Role mais alta do user nesse Klub. Null se só Membership sem role. */
  role: Role | null;
  joinedAt: string;
}

// ─── Sports ─────────────────────────────────────────────────────────────

export interface SportCatalog {
  code: string;
  name: string;
  description: string | null;
}

export interface PlayerSportEnrollment {
  id: string;
  userId: string;
  klubSportProfileId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  approvedById: string | null;
  approvedAt: string | null;
  suspendedAt: string | null;
  suspendedById: string | null;
  suspensionReason: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
}

// ─── API error envelope ─────────────────────────────────────────────────

/** Shape do erro de validação Zod retornado pelo `ZodExceptionFilter`. */
export interface ValidationErrorResponse {
  statusCode: 400;
  message: 'Validation failed';
  errors: { path: (string | number)[]; message: string }[];
  path: string;
}
