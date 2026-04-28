import type {
  RankingPointsMap,
  RankingPointsSchema,
  TournamentBracket,
  TournamentDetail,
  TournamentEntry,
  TournamentFormat,
  TournamentRegistrationApproval,
  TournamentResultReportingMode,
  TournamentStatus,
} from '@draftklub/shared-types';
import { apiFetch } from './client';

/**
 * Sprint K — clients de torneios. Read em K1; create em K2a; draw/schedule/
 * cancel/match operations entram em K2b/K3+.
 */

/** Item leve do GET /klubs/:klubId/sports/:sportCode/tournaments. */
export interface TournamentListItem {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  currentPhase: string | null;
  hasPrequalifiers: boolean;
  registrationApproval: TournamentRegistrationApproval;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  drawDate: string | null;
  mainStartDate: string | null;
  mainEndDate: string | null;
  entryCount: number;
  categoryCount: number;
}

export function listKlubTournaments(
  klubId: string,
  sportCode: string,
): Promise<TournamentListItem[]> {
  return apiFetch<TournamentListItem[]>(`/klubs/${klubId}/sports/${sportCode}/tournaments`);
}

export function getTournament(
  klubId: string,
  sportCode: string,
  tournamentId: string,
): Promise<TournamentDetail> {
  return apiFetch<TournamentDetail>(
    `/klubs/${klubId}/sports/${sportCode}/tournaments/${tournamentId}`,
  );
}

export function listTournamentEntries(tournamentId: string): Promise<TournamentEntry[]> {
  return apiFetch<TournamentEntry[]>(`/tournaments/${tournamentId}/entries`);
}

export function getTournamentBracket(tournamentId: string): Promise<TournamentBracket> {
  return apiFetch<TournamentBracket>(`/tournaments/${tournamentId}/bracket`);
}

export function listPointsSchemas(
  klubId: string,
  sportCode: string,
): Promise<RankingPointsSchema[]> {
  return apiFetch<RankingPointsSchema[]>(`/klubs/${klubId}/sports/${sportCode}/points-schemas`);
}

// ─── Mutations (Sprint K PR-K2a) ────────────────────────────────────────

export interface CreatePointsSchemaInput {
  name: string;
  description?: string;
  /** JSON shape: { champion: 100, runnerUp: 50, semi: 25, ... } */
  points: RankingPointsMap;
}

export function createPointsSchema(
  klubId: string,
  sportCode: string,
  input: CreatePointsSchemaInput,
): Promise<RankingPointsSchema> {
  return apiFetch<RankingPointsSchema>(`/klubs/${klubId}/sports/${sportCode}/points-schemas`, {
    method: 'POST',
    json: input,
  });
}

export interface CreateTournamentCategoryInput {
  name: string;
  order: number;
  maxPlayers?: number;
  minRatingExpected?: number;
  maxRatingExpected?: number;
  pointsSchemaId: string;
}

export interface CreateTournamentInput {
  rankingId: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  hasPrequalifiers: boolean;
  prequalifierBordersPerFrontier?: number;
  registrationApproval: TournamentRegistrationApproval;
  registrationFee?: number;
  /** ISO 8601 datetime strings — backend transforma com z.datetime(). */
  registrationOpensAt: string;
  registrationClosesAt: string;
  drawDate: string;
  prequalifierStartDate?: string;
  prequalifierEndDate?: string;
  mainStartDate: string;
  mainEndDate?: string;
  resultReportingMode: TournamentResultReportingMode;
  categories: CreateTournamentCategoryInput[];
}

export function createTournament(
  klubId: string,
  sportCode: string,
  input: CreateTournamentInput,
): Promise<TournamentDetail> {
  return apiFetch<TournamentDetail>(`/klubs/${klubId}/sports/${sportCode}/tournaments`, {
    method: 'POST',
    json: input,
  });
}

// ─── Mutations (Sprint K PR-K2b — draw + schedule + reporting mode) ────

/** POST /tournaments/:id/draw — gera matches do bracket. */
export function drawTournament(tournamentId: string): Promise<unknown> {
  return apiFetch(`/tournaments/${tournamentId}/draw`, { method: 'POST', json: {} });
}

/** Config pra distribuir matches em spaces+horários. Backend usa ScheduleDistributorService. */
export interface ScheduleConfigInput {
  /** Datas no formato `YYYY-MM-DD`. */
  availableDates: string[];
  /** Hora de início (0–23). */
  startHour: number;
  /** Hora de fim (1–24). Maior que startHour. */
  endHour: number;
  /** Duração de cada match (30–360 min). */
  matchDurationMinutes: number;
  /** Intervalo entre matches no mesmo space (0–120 min). */
  breakBetweenMatchesMinutes?: number;
  /** Spaces (quadras) onde alocar matches. */
  spaceIds: string[];
  /** Tempo mínimo de descanso de um player entre matches (0–360 min). */
  restRuleMinutes?: number;
}

/** POST /tournaments/:id/schedule — distribui matches em quadras+horários. */
export function scheduleTournament(
  tournamentId: string,
  config?: ScheduleConfigInput,
): Promise<unknown> {
  return apiFetch(`/tournaments/${tournamentId}/schedule`, {
    method: 'POST',
    json: config ?? {},
  });
}

/** PATCH /tournaments/:id/reporting-mode — muda modo de reportagem em massa. */
export function updateReportingMode(
  tournamentId: string,
  mode: TournamentResultReportingMode,
): Promise<unknown> {
  return apiFetch(`/tournaments/${tournamentId}/reporting-mode`, {
    method: 'PATCH',
    json: { mode },
  });
}

// ─── Mutations (Sprint K PR-K3a — entries) ─────────────────────────────

/** POST /tournaments/:id/entries — auto-register caller no torneio. */
export function registerTournamentEntry(tournamentId: string): Promise<TournamentEntry> {
  return apiFetch<TournamentEntry>(`/tournaments/${tournamentId}/entries`, {
    method: 'POST',
    json: {},
  });
}

/** DELETE /tournaments/:id/entries/me — caller cancela própria inscrição. */
export function withdrawMyTournamentEntry(tournamentId: string): Promise<unknown> {
  return apiFetch(`/tournaments/${tournamentId}/entries/me`, { method: 'DELETE' });
}

/** POST /tournaments/:id/entries/:entryId/approve — committee aprova entry pendente. */
export function approveTournamentEntry(
  tournamentId: string,
  entryId: string,
): Promise<TournamentEntry> {
  return apiFetch<TournamentEntry>(`/tournaments/${tournamentId}/entries/${entryId}/approve`, {
    method: 'POST',
    json: {},
  });
}

/** PATCH /tournaments/:id/entries/:entryId/category — committee move player de categoria. */
export function moveTournamentEntryCategory(
  tournamentId: string,
  entryId: string,
  input: { targetCategoryId: string; asWildCard?: boolean },
): Promise<TournamentEntry> {
  return apiFetch<TournamentEntry>(`/tournaments/${tournamentId}/entries/${entryId}/category`, {
    method: 'PATCH',
    json: input,
  });
}
