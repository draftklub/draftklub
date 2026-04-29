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

/**
 * Roles do sistema. Sprint Polish PR-J1 reestruturou:
 * - Plataforma: PLATFORM_OWNER (singleton) + PLATFORM_ADMIN (max 3).
 *   Substituem o antigo SUPER_ADMIN.
 * - Klub: KLUB_ADMIN (singleton por Klub) + KLUB_ASSISTANT (multi).
 *   Assistant tem todas perms do Admin EXCETO mexer no role do Admin.
 * - Modalidade: SPORT_COMMISSION (organização — torneios, ranking,
 *   regras) + SPORT_STAFF (operação — recepção, manutenção, in-loco).
 *   Antigos STAFF e SPORTS_COMMITTEE renomeados.
 * - PLAYER: default.
 * - TEACHER removido (será reestruturado no futuro).
 */
export type Role =
  | 'PLATFORM_OWNER'
  | 'PLATFORM_ADMIN'
  | 'KLUB_ADMIN'
  | 'KLUB_ASSISTANT'
  | 'SPORT_COMMISSION'
  | 'SPORT_STAFF'
  | 'PLAYER';

export type UserKind = 'regular' | 'guest';

export type DocumentType = 'cpf' | 'rg' | 'passport' | 'other';

export type Gender = 'male' | 'female' | 'undisclosed';

/**
 * Preferências de notificação. Shape canônico salvo em jsonb. Toggles
 * faltantes são interpretados como `true` (default opt-in pra todos
 * tipos; user opta-out explicitamente).
 *
 * Sprint atual (Onda 2 PR-A7): só persistência. Mailer integration
 * (consume essas prefs) é Onda 3.
 */
export interface NotificationPrefs {
  email?: {
    enrollment?: boolean; // approvação/rejeição de inscrição em modalidade
    booking?: boolean; // confirmação/cancelamento de reserva
    tournament?: boolean; // próximo torneio inscrito
    invitation?: boolean; // convite recebido
    announcement?: boolean; // anúncio do Klub Admin
  };
}

/** Tema da UI. `'system'` segue prefers-color-scheme do navegador. */
export type ThemePreference = 'light' | 'dark' | 'system';

export type MembershipType = 'member' | 'guest' | 'staff';

export type MembershipStatus = 'active' | 'inactive' | 'suspended';

/**
 * Tipo de Klub. Sprint Polish PR-G: lista expandida pra cobrir
 * realidade do mercado (arenas comerciais de padel/beach tennis,
 * hotéis, universidades). Tipos antigos mantidos pra back-compat.
 */
export type KlubType =
  | 'sports_club'
  | 'arena'
  | 'academy'
  | 'condo'
  | 'hotel_resort'
  | 'university'
  | 'school'
  | 'public_space'
  | 'individual';

export type KlubPlan = 'trial' | 'starter' | 'pro' | 'elite' | 'enterprise';

export type KlubStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

/**
 * Modo de acesso de um Klub: 'public' = qualquer auth user pode entrar
 * direto via klub.join_via_link; 'private' = precisa MembershipRequest
 * com aprovação do admin (Sprint C).
 */
export type KlubAccessMode = 'public' | 'private';

/**
 * Sprint D PR1 — review administrativo do cadastro do Klub. Ortogonal
 * a `status` (trial/active/...) e `kycStatus`. Klub fica oculto até
 * `approved`. SUPER_ADMIN da plataforma decide via /admin/cadastros (PR2).
 */
export type KlubReviewStatus = 'pending' | 'approved' | 'rejected';

/**
 * Origem dos campos de endereço do Klub. Anti-divergência: campos
 * preenchidos via Receita Federal (BrasilAPI CNPJ lookup) ficam
 * read-only no UI até user "Editar manualmente".
 */
export type KlubAddressSource = 'cnpj_lookup' | 'manual';

/** Situação cadastral retornada pelo BrasilAPI CNPJ. Snapshot pra audit. */
export type CnpjSituacao = 'ativa' | 'baixada' | 'suspensa' | 'inapta' | 'nula';

/**
 * Resultado normalizado da consulta de CNPJ via BrasilAPI v1
 * (https://brasilapi.com.br/api/cnpj/v1/{cnpj}). Backend devolve
 * pra autopopular o /criar-klub e salva snapshot completo no DB.
 */
export interface CnpjLookupResult {
  razaoSocial: string | null;
  nomeFantasia: string | null;
  situacaoCadastral: CnpjSituacao | null;
  descricaoSituacao: string | null;
  dataSituacao: string | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    cep: string | null;
  };
  contato: {
    telefone: string | null;
    email: string | null;
  };
  capitalSocial: number | null;
  atividadePrimaria: string | null;
  dataAbertura: string | null;
  raw: Record<string, unknown>;
}

export interface CheckSlugResponse {
  slug: string;
  available: boolean;
  suggestedSlug: string | null;
  conflictKlubName: string | null;
}

/**
 * Sprint D PR2 — payload da listagem admin de cadastros (`GET
 * /admin/klubs/pending`). Subset enxuto pra grid; detalhe completo vem
 * via `GET /admin/klubs/:id`.
 */
export interface AdminPendingKlubItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  entityType: 'pj' | 'pf' | null;
  documentHint: string | null;
  legalName: string | null;
  city: string | null;
  state: string | null;
  cnpjStatus: CnpjSituacao | null;
  reviewStatus: KlubReviewStatus;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
    documentNumber: string | null;
  } | null;
}

export interface AdminPendingKlubsPage {
  items: AdminPendingKlubItem[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Detalhe completo do cadastro (`GET /admin/klubs/:id`). Inclui raw da
 * Receita pra audit, endereço granular, e flag de conflito de slug
 * pra UI bloquear "Aprovar" enquanto não resolve.
 */
/**
 * Sprint C PR1 — pedido de entrada em Klub privado.
 * Status:
 *  - 'pending'   — aguardando decisão do KLUB_ADMIN.
 *  - 'approved'  — aprovado; Membership + RoleAssignment PLAYER criados.
 *  - 'rejected'  — rejeitado pelo admin (com `rejectionReason`).
 *  - 'cancelled' — solicitante cancelou antes da decisão.
 */
export type MembershipRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface MembershipRequest {
  id: string;
  klubId: string;
  userId: string;
  status: MembershipRequestStatus;
  message: string;
  attachmentUrl: string | null;
  decisionAt: string | null;
  decidedById: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Item da lista admin (`GET /klubs/:klubId/membership-requests`). */
export interface MembershipRequestAdminItem extends MembershipRequest {
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

/** Item da lista do user (`GET /me/membership-requests`). */
export interface MembershipRequestForUser extends MembershipRequest {
  klub: {
    id: string;
    slug: string;
    name: string;
  };
}

export interface AdminPendingKlubDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  entityType: 'pj' | 'pf' | null;
  documentHint: string | null;
  legalName: string | null;
  cnpjStatus: CnpjSituacao | null;
  cnpjStatusCheckedAt: string | null;
  cnpjLookupData: Record<string, unknown> | null;
  cep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  city: string | null;
  state: string | null;
  addressSource: KlubAddressSource | null;
  discoverable: boolean;
  accessMode: string;
  sports: string[];
  reviewStatus: KlubReviewStatus;
  reviewRejectionReason: string | null;
  reviewDecisionAt: string | null;
  reviewDecidedById: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
    documentNumber: string | null;
    phone: string | null;
  } | null;
  slugConflictKlubName: string | null;
}

export type AccessMode = 'public' | 'members_only';

export type BookingMode = 'direct' | 'staff_approval' | 'staff_only';

export type CancellationMode = 'free' | 'with_deadline' | 'staff_only';

export type AgendaVisibility = 'public' | 'private';

export type ExtensionMode = 'disabled' | 'player' | 'staff_approval' | 'staff_only';

export type GuestsAddedBy = 'player' | 'staff' | 'both';

export type TournamentBookingConflictMode = 'block_avulso' | 'auto_cancel_avulso' | 'staff_decides';

export type SportProfileStatus = 'active' | 'inactive';

export type EnrollmentStatus = 'pending' | 'active' | 'suspended' | 'cancelled';

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
 * Sprint Polish PR-J2 — payload de listagem de role assignments para a UI
 * de gestão de equipe (platform admins + klub team).
 */
export interface RoleAssignmentListItem {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  role: Role;
  scopeKlubId: string | null;
  scopeSportId: string | null;
  /** ISO timestamp. */
  grantedAt: string;
  grantedBy: string | null;
}

/** POST /platform/role-assignments — Owner concede PLATFORM_ADMIN. */
export interface GrantPlatformRoleInput {
  email: string;
}

/** POST /klubs/:klubId/role-assignments — KLUB_ADMIN concede roles scopadas. */
export interface GrantKlubRoleInput {
  email: string;
  role: 'KLUB_ASSISTANT' | 'SPORT_COMMISSION' | 'SPORT_STAFF';
  scopeSportId?: string;
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
  fullName: string;
  phone: string | null;
  /** ISO `YYYY-MM-DD` — só a parte de data, sem time. */
  birthDate: string | null;
  avatarUrl: string | null;
  gender: Gender | null;
  city: string | null;
  /** UF Brasil, 2 chars maiúsculo (ex `RJ`). */
  state: string | null;
  /** CEP brasileiro só dígitos, 8 chars (ex `22440000`). */
  cep: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  /** Lat/lng geocodados via CEP (BrasilAPI). Null se geocoding falhou. */
  latitude: number | null;
  longitude: number | null;
  /** CPF só dígitos, 11 chars. Após setado, geralmente não muda. */
  documentNumber: string | null;
  documentType: DocumentType | null;
  notificationPrefs: NotificationPrefs;
  roleAssignments: RoleAssignment[];
}

// ─── Klub ───────────────────────────────────────────────────────────────

export interface Klub {
  id: string;
  name: string;
  slug: string;
  /** Abreviação curta pra UI compacta (Sprint Polish PR-G). Ex: "PAC". */
  abbreviation: string | null;
  /** Nome popular/colloquial (Sprint Polish PR-G). Ex: "Paissandú". */
  commonName: string | null;
  /** Bio livre do Klub (Sprint Polish PR-F). */
  description: string | null;
  type: KlubType;
  plan: KlubPlan;
  status: KlubStatus;
  city: string | null;
  state: string | null;
  timezone: string;
  email: string | null;
  phone: string | null;
  /** Link público (Sprint Polish PR-F). */
  website: string | null;
  /** URL do avatar/logo (Sprint Polish PR-F). */
  avatarUrl: string | null;
  /** URL da imagem de capa (Sprint Polish PR-F). */
  coverUrl: string | null;
  documentHint: string | null;
  legalName: string | null;
  parentKlubId: string | null;
  isGroup: boolean;
  /** Códigos de modalidade habilitadas (lista direta — atalho da relação `sportProfiles`). */
  sports: string[];
  config: KlubConfig | null;
  /** Aparece em `GET /klubs/discover`. Opt-in pelo Klub Admin. */
  discoverable: boolean;
  /** 'public' = entrada livre; 'private' = precisa aprovação (Sprint C). */
  accessMode: KlubAccessMode;
  /** CEP só dígitos (8 chars). Source pra geocoding (Sprint B+1). */
  cep: string | null;
  /** Endereço granular (Sprint D PR1). */
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  /** Coordenadas do Klub (Sprint Polish PR-H4). Source: geocoding via CEP. */
  latitude: number | null;
  longitude: number | null;
  /** Status de aprovação na plataforma (Sprint D PR1). */
  reviewStatus: KlubReviewStatus;
  reviewRejectionReason: string | null;
  createdAt: string;
}

/**
 * Item retornado por `GET /klubs/discover`. Subset enxuto pra UI de
 * busca; não inclui config, billing nem audit.
 */
export interface KlubDiscoveryResult {
  id: string;
  name: string;
  slug: string;
  type: KlubType;
  status: KlubStatus;
  city: string | null;
  state: string | null;
  sports: string[];
  accessMode: KlubAccessMode;
  /** Lat/lng do Klub (geocodado via CEP). Null se Klub não tem CEP ou geocoding falhou. */
  latitude: number | null;
  longitude: number | null;
  /** Distância em km do user até o Klub (Haversine). Null se busca não usou geo. */
  distanceKm: number | null;
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

// ─── Space (quadra) ─────────────────────────────────────────────────────

export type SpaceType = 'court' | 'room' | 'pool' | 'field' | 'other';
export type SpaceSurface = 'clay' | 'hard' | 'grass' | 'synthetic' | 'carpet';
export type SpaceStatus = 'active' | 'maintenance' | 'inactive';
export type MatchType = 'singles' | 'doubles';
export type HourBandType = 'off_peak' | 'regular' | 'prime';

export interface HourBand {
  type: HourBandType;
  /** 0-23 */
  startHour: number;
  /** 1-24, exclusivo (band cobre [startHour, endHour)). */
  endHour: number;
  /** ISO weekday: 1=Mon, 7=Sun. */
  daysOfWeek: number[];
  durationByMatchType: { singles?: number; doubles?: number };
}

export interface Space {
  id: string;
  klubId: string;
  name: string;
  type: SpaceType;
  sportCode: string | null;
  surface: SpaceSurface | null;
  indoor: boolean;
  hasLighting: boolean;
  maxPlayers: number;
  description: string | null;
  status: SpaceStatus;
  bookingActive: boolean;
  slotGranularityMinutes: number;
  slotDefaultDurationMinutes: number;
  hourBands: HourBand[];
  allowedMatchTypes: MatchType[];
  createdAt: string;
  updatedAt: string;
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
  /** Sprint Polish PR-H1 — apelido popular pra UI compacta. */
  klubCommonName: string | null;
  /** Sprint Polish PR-H3 — modalidades ativas do Klub (sport codes). */
  sports: string[];
  klubPlan: KlubPlan;
  klubStatus: KlubStatus;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  /** Role mais alta do user nesse Klub. Null se só Membership sem role. */
  role: Role | null;
  joinedAt: string;
  /** Sprint D PR1: status do cadastro na plataforma. */
  reviewStatus: KlubReviewStatus;
  reviewRejectionReason: string | null;
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

// ─── Rankings + Matches (Sprint K — competition + ranking) ──────────────

/** Engine de cálculo de rating. Configurado por ranking. */
export type RatingEngine = 'elo' | 'win_loss' | 'points';

/** Tipo de ranking — define elegibilidade. */
export type RankingType = 'singles' | 'doubles' | 'mixed';

/** Como ordenar entries no ranking. */
export type RankingOrderBy = 'rating' | 'tournament_points' | 'combined';

/** Janela temporal pra cômputo do rating. */
export type RankingWindowType = 'all_time' | 'rolling_window' | 'season';

/** Estado de um MatchResult. */
export type MatchResultStatus = 'pending_confirmation' | 'confirmed' | 'disputed' | 'invalidated';

/** Origem de um MatchResult. */
export type MatchResultSource = 'casual' | 'tournament' | 'tournament_prequalifier';

/** Item leve do GET /klubs/:klubId/sports/:sportCode/rankings. */
export interface RankingListItem {
  id: string;
  name: string;
  type: RankingType;
  gender: string | null;
  ageMin: number | null;
  ageMax: number | null;
  ratingEngine: RatingEngine;
  initialRating: number;
  active: boolean;
  playerCount: number;
  createdAt: string;
}

/** Linha de player na listagem de ranking detail. */
export interface RankingPlayerEntry {
  position: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rating: number;
  tournamentPoints: number;
  ratingSource: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  /** Delta da última atualização de rating; positivo se ganhou. */
  lastRatingChange: number;
  lastPlayedAt: string | null;
}

/** Detail completa do ranking — GET /klubs/.../rankings/:rankingId. */
export interface RankingDetail {
  id: string;
  name: string;
  type: RankingType;
  gender: string | null;
  ageMin: number | null;
  ageMax: number | null;
  ratingEngine: RatingEngine;
  initialRating: number;
  active: boolean;
  orderBy: RankingOrderBy;
  windowType: RankingWindowType;
  windowSize: number | null;
  includesCasualMatches: boolean;
  includesTournamentMatches: boolean;
  includesTournamentPoints: boolean;
  players: RankingPlayerEntry[];
  /** Sprint N batch 5 — pagination cursor. null = última página. */
  nextCursor?: string | null;
  /** Sprint N batch 5 — total de entries no leaderboard (não paginado). */
  totalCount?: number;
}

/**
 * Sprint K PR-K5a — payload de `GET /me/pending-match-confirmations`.
 * Lista matches que o caller precisa confirmar (player que não foi
 * submitter), tanto casuais quanto de torneio em modo player_with_confirm.
 */
export interface PendingMatchConfirmationItem {
  matchId: string;
  rankingId: string;
  rankingName: string;
  source: MatchResultSource;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  winnerId: string | null;
  score: string | null;
  /** ISO 8601. */
  playedAt: string;
  submittedById: string;
  submittedByName: string;
  /** Tournament context se source != 'casual'. */
  tournamentId: string | null;
  tournamentName: string | null;
}

/** Result de match (casual ou de torneio). */
export interface MatchResult {
  id: string;
  rankingId: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  score: string | null;
  status: MatchResultStatus;
  source: MatchResultSource;
  submittedById: string;
  confirmedById: string | null;
  confirmedAt: string | null;
  player1RatingBefore: number | null;
  player2RatingBefore: number | null;
  player1RatingAfter: number | null;
  player2RatingAfter: number | null;
  ratingDelta1: number | null;
  ratingDelta2: number | null;
  playedAt: string;
  spaceId: string | null;
  notes: string | null;
  /** Se vier de torneio, refs preenchidas. */
  tournamentId: string | null;
  tournamentMatchId: string | null;
  isWalkover: boolean;
}

// ─── Tournaments (Sprint K) ─────────────────────────────────────────────

export type TournamentFormat =
  | 'knockout'
  | 'round_robin'
  | 'double_elimination'
  | 'groups_knockout';

export type TournamentStatus = 'draft' | 'prequalifying' | 'in_progress' | 'finished' | 'cancelled';

export type TournamentRegistrationApproval = 'auto' | 'committee';

export type TournamentResultReportingMode = 'committee_only' | 'player_with_confirm';

export type TournamentEntryStatus = 'pending_approval' | 'pending_seeding' | 'seeded' | 'withdrawn';

export type TournamentMatchStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'completed'
  | 'bye'
  | 'walkover'
  | 'double_walkover';

export type TournamentMatchKind = 'main' | 'group' | 'losers' | 'grand_final' | 'prequalifier';

/** Shape do RankingPointsSchema.points — chaves variam (champion, runnerUp, etc). */
export type RankingPointsMap = Record<string, number>;

export interface RankingPointsSchema {
  id: string;
  klubSportId: string;
  name: string;
  description: string | null;
  points: RankingPointsMap;
  active: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  order: number;
  maxPlayers: number | null;
  minRatingExpected: number | null;
  maxRatingExpected: number | null;
  pointsSchemaId: string;
}

/** Tournament detail — usado em GET /klubs/.../tournaments/:id. */
export interface TournamentDetail {
  id: string;
  klubSportId: string;
  rankingId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  format: TournamentFormat;
  hasPrequalifiers: boolean;
  prequalifierBordersPerFrontier: number | null;
  registrationApproval: TournamentRegistrationApproval;
  registrationFee: string | null;
  registrationOpensAt: string;
  registrationClosesAt: string;
  drawDate: string;
  prequalifierStartDate: string | null;
  prequalifierEndDate: string | null;
  mainStartDate: string;
  mainEndDate: string | null;
  status: TournamentStatus;
  currentPhase: string | null;
  resultReportingMode: TournamentResultReportingMode;
  pointsApplied: boolean;
  pointsAppliedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  /** Categorias inline pra evitar fetch separado. */
  categories: TournamentCategory[];
  /** Stats agregadas pro detail header. */
  entryCount: number;
  matchCount: number;
  createdAt: string;
}

/** Inscrição no torneio. */
export interface TournamentEntry {
  id: string;
  tournamentId: string;
  userId: string;
  /** Joined com User pra UI poder mostrar nome direto. */
  userFullName: string;
  userAvatarUrl: string | null;
  categoryId: string | null;
  status: TournamentEntryStatus;
  finalPosition: string | null;
  ratingAtEntry: number | null;
  categorySource: 'auto' | 'manual';
  isWildCard: boolean;
  registeredAt: string;
  approvedAt: string | null;
  withdrawnAt: string | null;
}

/** Match individual no bracket. Refs de TBD (To Be Determined) ficam pra prequalifier. */
export interface TournamentMatchView {
  id: string;
  tournamentId: string;
  categoryId: string;
  phase: string;
  round: number;
  bracketPosition: string;
  slotTop: number;
  slotBottom: number;
  player1Id: string | null;
  player2Id: string | null;
  player1Name: string | null;
  player2Name: string | null;
  seed1: number | null;
  seed2: number | null;
  isBye: boolean;
  status: TournamentMatchStatus;
  winnerId: string | null;
  matchKind: TournamentMatchKind;
  scheduledFor: string | null;
  completedAt: string | null;
  /** Score final se completed (vem do MatchResult). */
  score: string | null;
  /** Label "TBD" pra slots que dependem de match prequalificatório. */
  tbdPlayer1Label: string | null;
  tbdPlayer2Label: string | null;
  /** Sprint K PR-K5a — quadra alocada via schedule. */
  spaceId: string | null;
  spaceName: string | null;
  /** Sprint K PR-K5e — refs pra renderização de bracket visual + tracking de cascata. */
  nextMatchId: string | null;
  nextMatchSlot: 'top' | 'bottom' | null;
}

/** Bracket completo organizado por categoria — GET /tournaments/:id/bracket. */
export interface TournamentBracket {
  tournamentId: string;
  categories: {
    id: string;
    name: string;
    matches: TournamentMatchView[];
  }[];
}

/** Sprint K PR-K4 — preview de revert de match. */
export interface RatingDeltaPreview {
  userId: string;
  ratingBefore: number;
  ratingAfter: number;
  /** Delta original aplicado quando match foi confirmed (positivo se ganhou). */
  delta: number;
  /** Quanto será revertido (oposto do delta). */
  toRevert: number;
}

export interface AffectedMatchPreview {
  id: string;
  bracketPosition: string;
  phase: string;
  status: string;
  /** Pra que estado o match cai após revert. */
  willRevertTo: 'scheduled' | 'TBD slot';
}

export interface PreviewMatchRevertResult {
  matchId: string;
  cascade: {
    affectedMatches: AffectedMatchPreview[];
    ratingDeltas: RatingDeltaPreview[];
    /** Warnings i18n keys: 'prequalifier_dual_path_warning', 'cascade_depth_exceeded_1_level', etc. */
    warnings: string[];
  };
}

// ─── API error envelope ─────────────────────────────────────────────────

/** Shape do erro de validação Zod retornado pelo `ZodExceptionFilter`. */
export interface ValidationErrorResponse {
  statusCode: 400;
  message: 'Validation failed';
  errors: { path: (string | number)[]; message: string }[];
  path: string;
}
