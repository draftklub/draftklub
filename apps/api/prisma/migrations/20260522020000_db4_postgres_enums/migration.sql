-- DB-4: Postgres ENUMs nativos para todos os campos String com valores fixos.
-- Cada CREATE TYPE cria o tipo nativo; ALTER COLUMN converte a coluna existente.
-- Padrão: USING column::schema.EnumName + SET DEFAULT para manter consistência.

-- ═══════════════════════════════════════════════════════════════════════════════
-- audit schema
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "audit"."OutboxEventStatus" AS ENUM ('pending', 'sent', 'dead');

ALTER TABLE "audit"."outbox_events"
  ALTER COLUMN "status" TYPE "audit"."OutboxEventStatus"
  USING "status"::"audit"."OutboxEventStatus";
ALTER TABLE "audit"."outbox_events"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"audit"."OutboxEventStatus";

-- ═══════════════════════════════════════════════════════════════════════════════
-- identity schema
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "identity"."UserKind"     AS ENUM ('regular', 'guest');
CREATE TYPE "identity"."UserGender"   AS ENUM ('male', 'female', 'undisclosed');
CREATE TYPE "identity"."DocumentType" AS ENUM ('cpf', 'rg', 'passport', 'other');
CREATE TYPE "identity"."MembershipStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "identity"."MembershipType"   AS ENUM ('member', 'staff', 'guest');
CREATE TYPE "identity"."FeatureTier"      AS ENUM ('free', 'premium', 'disabled');

ALTER TABLE "identity"."users"
  ALTER COLUMN "kind" TYPE "identity"."UserKind"
  USING "kind"::"identity"."UserKind";
ALTER TABLE "identity"."users"
  ALTER COLUMN "kind" SET DEFAULT 'regular'::"identity"."UserKind";

ALTER TABLE "identity"."users"
  ALTER COLUMN "gender" TYPE "identity"."UserGender"
  USING "gender"::"identity"."UserGender";

ALTER TABLE "identity"."users"
  ALTER COLUMN "document_type" TYPE "identity"."DocumentType"
  USING "document_type"::"identity"."DocumentType";

ALTER TABLE "identity"."memberships"
  ALTER COLUMN "status" TYPE "identity"."MembershipStatus"
  USING "status"::"identity"."MembershipStatus";
ALTER TABLE "identity"."memberships"
  ALTER COLUMN "status" SET DEFAULT 'active'::"identity"."MembershipStatus";

ALTER TABLE "identity"."memberships"
  ALTER COLUMN "type" TYPE "identity"."MembershipType"
  USING "type"::"identity"."MembershipType";
ALTER TABLE "identity"."memberships"
  ALTER COLUMN "type" SET DEFAULT 'member'::"identity"."MembershipType";

ALTER TABLE "identity"."features"
  ALTER COLUMN "tier" TYPE "identity"."FeatureTier"
  USING "tier"::"identity"."FeatureTier";
ALTER TABLE "identity"."features"
  ALTER COLUMN "tier" SET DEFAULT 'free'::"identity"."FeatureTier";

-- ═══════════════════════════════════════════════════════════════════════════════
-- klub schema
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "klub"."MembershipRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TYPE "klub"."KlubType" AS ENUM (
  'sports_club', 'arena', 'academy', 'condo', 'hotel_resort',
  'university', 'school', 'public_space', 'individual'
);

CREATE TYPE "klub"."KlubEntityType"  AS ENUM ('pj', 'pf');
CREATE TYPE "klub"."KlubKycStatus"   AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "klub"."KlubPlan"        AS ENUM ('trial', 'starter', 'pro', 'elite', 'enterprise');
CREATE TYPE "klub"."KlubStatus"      AS ENUM ('trial', 'active', 'suspended', 'churned', 'pending_payment');
CREATE TYPE "klub"."KlubAccessMode"  AS ENUM ('public', 'private');
CREATE TYPE "klub"."KlubOnboardingSource" AS ENUM ('self_service', 'sales_led');
CREATE TYPE "klub"."KlubReviewStatus"    AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "klub"."KlubConfigAccessMode" AS ENUM ('public', 'members_only');
CREATE TYPE "klub"."KlubCancellationMode" AS ENUM ('free', 'with_deadline', 'staff_only');
CREATE TYPE "klub"."KlubAgendaVisibility" AS ENUM ('public', 'private');
CREATE TYPE "klub"."KlubExtensionMode"    AS ENUM ('disabled', 'player', 'staff_approval', 'staff_only');
CREATE TYPE "klub"."KlubGuestsAddedBy"    AS ENUM ('player', 'staff', 'both');
CREATE TYPE "klub"."KlubTournamentConflictMode" AS ENUM ('block_avulso', 'auto_cancel_avulso', 'staff_decides');
CREATE TYPE "klub"."KlubAddressSource"    AS ENUM ('cnpj_lookup', 'manual');
CREATE TYPE "klub"."KlubMediaType"        AS ENUM ('photo', 'video', 'cover', 'logo');
CREATE TYPE "klub"."KlubSportProfileStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "klub"."KlubRequestStatus"    AS ENUM ('pending', 'approved', 'rejected', 'converted');
CREATE TYPE "klub"."EnrollmentStatus"     AS ENUM ('pending', 'active', 'suspended', 'cancelled');
CREATE TYPE "klub"."RatingEngineType"     AS ENUM ('elo', 'points', 'win_loss');
CREATE TYPE "klub"."RankingType"          AS ENUM ('singles', 'doubles', 'mixed');
CREATE TYPE "klub"."RankingOrderBy"       AS ENUM ('rating', 'tournament_points', 'combined');
CREATE TYPE "klub"."RankingWindowType"    AS ENUM ('all_time', 'season', 'semester', 'last_weeks', 'last_tournaments');
CREATE TYPE "klub"."PlayerRatingSource"   AS ENUM ('initial', 'calculated', 'manual');
CREATE TYPE "klub"."MatchResultStatus"    AS ENUM ('pending_confirmation', 'confirmed', 'reverted');
CREATE TYPE "klub"."MatchSource"          AS ENUM ('casual', 'tournament', 'tournament_prequalifier');
CREATE TYPE "klub"."TournamentFormat"     AS ENUM ('knockout', 'round_robin', 'double_elimination', 'groups_knockout');
CREATE TYPE "klub"."TournamentRegistrationApproval" AS ENUM ('auto', 'committee');
CREATE TYPE "klub"."TournamentStatus"     AS ENUM ('draft', 'prequalifying', 'in_progress', 'finished', 'cancelled');
CREATE TYPE "klub"."TournamentResultReportingMode" AS ENUM ('committee_only', 'player_with_confirm');
CREATE TYPE "klub"."TournamentMatchStatus" AS ENUM (
  'pending', 'scheduled', 'bye', 'awaiting_confirmation',
  'completed', 'walkover', 'double_walkover', 'cancelled'
);
CREATE TYPE "klub"."TournamentMatchKind"  AS ENUM ('main', 'prequalifier', 'group', 'losers', 'grand_final');
CREATE TYPE "klub"."TournamentEntryStatus" AS ENUM ('pending_approval', 'pending_seeding', 'seeded', 'playing', 'disqualified', 'withdrawn');
CREATE TYPE "klub"."TournamentEntryCategorySource" AS ENUM ('auto', 'manual', 'committee', 'wildcard');

-- membership_requests
ALTER TABLE "klub"."membership_requests"
  ALTER COLUMN "status" TYPE "klub"."MembershipRequestStatus"
  USING "status"::"klub"."MembershipRequestStatus";
ALTER TABLE "klub"."membership_requests"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"klub"."MembershipRequestStatus";

-- klubs
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "type" TYPE "klub"."KlubType"
  USING "type"::"klub"."KlubType";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "type" SET DEFAULT 'sports_club'::"klub"."KlubType";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "entity_type" TYPE "klub"."KlubEntityType"
  USING "entity_type"::"klub"."KlubEntityType";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "kyc_status" TYPE "klub"."KlubKycStatus"
  USING "kyc_status"::"klub"."KlubKycStatus";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "kyc_status" SET DEFAULT 'pending'::"klub"."KlubKycStatus";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "plan" TYPE "klub"."KlubPlan"
  USING "plan"::"klub"."KlubPlan";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "plan" SET DEFAULT 'trial'::"klub"."KlubPlan";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "status" TYPE "klub"."KlubStatus"
  USING "status"::"klub"."KlubStatus";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "status" SET DEFAULT 'trial'::"klub"."KlubStatus";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "access_mode" TYPE "klub"."KlubAccessMode"
  USING "access_mode"::"klub"."KlubAccessMode";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "access_mode" SET DEFAULT 'public'::"klub"."KlubAccessMode";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "onboarding_source" TYPE "klub"."KlubOnboardingSource"
  USING "onboarding_source"::"klub"."KlubOnboardingSource";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "onboarding_source" SET DEFAULT 'self_service'::"klub"."KlubOnboardingSource";

ALTER TABLE "klub"."klubs"
  ALTER COLUMN "review_status" TYPE "klub"."KlubReviewStatus"
  USING "review_status"::"klub"."KlubReviewStatus";
ALTER TABLE "klub"."klubs"
  ALTER COLUMN "review_status" SET DEFAULT 'pending'::"klub"."KlubReviewStatus";

-- klub_configs
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "access_mode" TYPE "klub"."KlubConfigAccessMode"
  USING "access_mode"::"klub"."KlubConfigAccessMode";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "access_mode" SET DEFAULT 'members_only'::"klub"."KlubConfigAccessMode";

ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "cancellation_mode" TYPE "klub"."KlubCancellationMode"
  USING "cancellation_mode"::"klub"."KlubCancellationMode";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "cancellation_mode" SET DEFAULT 'with_deadline'::"klub"."KlubCancellationMode";

ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "agenda_visibility" TYPE "klub"."KlubAgendaVisibility"
  USING "agenda_visibility"::"klub"."KlubAgendaVisibility";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "agenda_visibility" SET DEFAULT 'public'::"klub"."KlubAgendaVisibility";

ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "booking_policy" TYPE "klub"."KlubConfigAccessMode"
  USING "booking_policy"::"klub"."KlubConfigAccessMode";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "booking_policy" SET DEFAULT 'members_only'::"klub"."KlubConfigAccessMode";

ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "extension_mode" TYPE "klub"."KlubExtensionMode"
  USING "extension_mode"::"klub"."KlubExtensionMode";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "extension_mode" SET DEFAULT 'disabled'::"klub"."KlubExtensionMode";

ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "guests_added_by" TYPE "klub"."KlubGuestsAddedBy"
  USING "guests_added_by"::"klub"."KlubGuestsAddedBy";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "guests_added_by" SET DEFAULT 'both'::"klub"."KlubGuestsAddedBy";

ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "tournament_booking_conflict_mode" TYPE "klub"."KlubTournamentConflictMode"
  USING "tournament_booking_conflict_mode"::"klub"."KlubTournamentConflictMode";
ALTER TABLE "klub"."klub_configs"
  ALTER COLUMN "tournament_booking_conflict_mode" SET DEFAULT 'staff_decides'::"klub"."KlubTournamentConflictMode";

-- klub_sport_profiles
ALTER TABLE "klub"."klub_sport_profiles"
  ALTER COLUMN "default_rating_engine" TYPE "klub"."RatingEngineType"
  USING "default_rating_engine"::"klub"."RatingEngineType";
ALTER TABLE "klub"."klub_sport_profiles"
  ALTER COLUMN "default_rating_engine" SET DEFAULT 'elo'::"klub"."RatingEngineType";

ALTER TABLE "klub"."klub_sport_profiles"
  ALTER COLUMN "status" TYPE "klub"."KlubSportProfileStatus"
  USING "status"::"klub"."KlubSportProfileStatus";
ALTER TABLE "klub"."klub_sport_profiles"
  ALTER COLUMN "status" SET DEFAULT 'active'::"klub"."KlubSportProfileStatus";

-- player_sport_enrollments
ALTER TABLE "klub"."player_sport_enrollments"
  ALTER COLUMN "status" TYPE "klub"."EnrollmentStatus"
  USING "status"::"klub"."EnrollmentStatus";
ALTER TABLE "klub"."player_sport_enrollments"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"klub"."EnrollmentStatus";

-- klub_sport_rankings
ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "type" TYPE "klub"."RankingType"
  USING "type"::"klub"."RankingType";
ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "type" SET DEFAULT 'singles'::"klub"."RankingType";

ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "gender" TYPE "identity"."UserGender"
  USING "gender"::"identity"."UserGender";

ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "rating_engine" TYPE "klub"."RatingEngineType"
  USING "rating_engine"::"klub"."RatingEngineType";
ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "rating_engine" SET DEFAULT 'elo'::"klub"."RatingEngineType";

ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "order_by" TYPE "klub"."RankingOrderBy"
  USING "order_by"::"klub"."RankingOrderBy";
ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "order_by" SET DEFAULT 'rating'::"klub"."RankingOrderBy";

ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "window_type" TYPE "klub"."RankingWindowType"
  USING "window_type"::"klub"."RankingWindowType";
ALTER TABLE "klub"."klub_sport_rankings"
  ALTER COLUMN "window_type" SET DEFAULT 'all_time'::"klub"."RankingWindowType";

-- player_ranking_entries
ALTER TABLE "klub"."player_ranking_entries"
  ALTER COLUMN "rating_source" TYPE "klub"."PlayerRatingSource"
  USING "rating_source"::"klub"."PlayerRatingSource";
ALTER TABLE "klub"."player_ranking_entries"
  ALTER COLUMN "rating_source" SET DEFAULT 'initial'::"klub"."PlayerRatingSource";

-- match_results
ALTER TABLE "klub"."match_results"
  ALTER COLUMN "status" TYPE "klub"."MatchResultStatus"
  USING "status"::"klub"."MatchResultStatus";
ALTER TABLE "klub"."match_results"
  ALTER COLUMN "status" SET DEFAULT 'pending_confirmation'::"klub"."MatchResultStatus";

ALTER TABLE "klub"."match_results"
  ALTER COLUMN "source" TYPE "klub"."MatchSource"
  USING "source"::"klub"."MatchSource";
ALTER TABLE "klub"."match_results"
  ALTER COLUMN "source" SET DEFAULT 'casual'::"klub"."MatchSource";

-- tournaments
ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "format" TYPE "klub"."TournamentFormat"
  USING "format"::"klub"."TournamentFormat";
ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "format" SET DEFAULT 'knockout'::"klub"."TournamentFormat";

ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "registration_approval" TYPE "klub"."TournamentRegistrationApproval"
  USING "registration_approval"::"klub"."TournamentRegistrationApproval";
ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "registration_approval" SET DEFAULT 'auto'::"klub"."TournamentRegistrationApproval";

ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "status" TYPE "klub"."TournamentStatus"
  USING "status"::"klub"."TournamentStatus";
ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "status" SET DEFAULT 'draft'::"klub"."TournamentStatus";

ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "result_reporting_mode" TYPE "klub"."TournamentResultReportingMode"
  USING "result_reporting_mode"::"klub"."TournamentResultReportingMode";
ALTER TABLE "klub"."tournaments"
  ALTER COLUMN "result_reporting_mode" SET DEFAULT 'committee_only'::"klub"."TournamentResultReportingMode";

-- tournament_matches
ALTER TABLE "klub"."tournament_matches"
  ALTER COLUMN "status" TYPE "klub"."TournamentMatchStatus"
  USING "status"::"klub"."TournamentMatchStatus";
ALTER TABLE "klub"."tournament_matches"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"klub"."TournamentMatchStatus";

ALTER TABLE "klub"."tournament_matches"
  ALTER COLUMN "match_kind" TYPE "klub"."TournamentMatchKind"
  USING "match_kind"::"klub"."TournamentMatchKind";
ALTER TABLE "klub"."tournament_matches"
  ALTER COLUMN "match_kind" SET DEFAULT 'main'::"klub"."TournamentMatchKind";

-- tournament_entries
ALTER TABLE "klub"."tournament_entries"
  ALTER COLUMN "status" TYPE "klub"."TournamentEntryStatus"
  USING "status"::"klub"."TournamentEntryStatus";
ALTER TABLE "klub"."tournament_entries"
  ALTER COLUMN "status" SET DEFAULT 'pending_seeding'::"klub"."TournamentEntryStatus";

ALTER TABLE "klub"."tournament_entries"
  ALTER COLUMN "category_source" TYPE "klub"."TournamentEntryCategorySource"
  USING "category_source"::"klub"."TournamentEntryCategorySource";
ALTER TABLE "klub"."tournament_entries"
  ALTER COLUMN "category_source" SET DEFAULT 'auto'::"klub"."TournamentEntryCategorySource";

-- klub_requests
ALTER TABLE "klub"."klub_requests"
  ALTER COLUMN "type" TYPE "klub"."KlubType"
  USING "type"::"klub"."KlubType";
ALTER TABLE "klub"."klub_requests"
  ALTER COLUMN "type" SET DEFAULT 'sports_club'::"klub"."KlubType";

ALTER TABLE "klub"."klub_requests"
  ALTER COLUMN "status" TYPE "klub"."KlubRequestStatus"
  USING "status"::"klub"."KlubRequestStatus";
ALTER TABLE "klub"."klub_requests"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"klub"."KlubRequestStatus";

-- klub_media
ALTER TABLE "klub"."klub_media"
  ALTER COLUMN "type" TYPE "klub"."KlubMediaType"
  USING "type"::"klub"."KlubMediaType";

-- ═══════════════════════════════════════════════════════════════════════════════
-- sports schema
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "sports"."SportPlayType" AS ENUM ('singles', 'doubles', 'both');

ALTER TABLE "sports"."catalog"
  ALTER COLUMN "play_type" TYPE "sports"."SportPlayType"
  USING "play_type"::"sports"."SportPlayType";
ALTER TABLE "sports"."catalog"
  ALTER COLUMN "play_type" SET DEFAULT 'both'::"sports"."SportPlayType";

-- ═══════════════════════════════════════════════════════════════════════════════
-- space schema
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "space"."SpaceType"    AS ENUM ('court', 'room', 'pool', 'field', 'other');
CREATE TYPE "space"."SpaceSurface" AS ENUM ('clay', 'hard', 'grass', 'synthetic', 'carpet');
CREATE TYPE "space"."SpaceStatus"  AS ENUM ('active', 'maintenance', 'inactive');

ALTER TABLE "space"."spaces"
  ALTER COLUMN "type" TYPE "space"."SpaceType"
  USING "type"::"space"."SpaceType";
ALTER TABLE "space"."spaces"
  ALTER COLUMN "type" SET DEFAULT 'court'::"space"."SpaceType";

ALTER TABLE "space"."spaces"
  ALTER COLUMN "surface" TYPE "space"."SpaceSurface"
  USING "surface"::"space"."SpaceSurface";

ALTER TABLE "space"."spaces"
  ALTER COLUMN "status" TYPE "space"."SpaceStatus"
  USING "status"::"space"."SpaceStatus";
ALTER TABLE "space"."spaces"
  ALTER COLUMN "status" SET DEFAULT 'active'::"space"."SpaceStatus";

-- ═══════════════════════════════════════════════════════════════════════════════
-- booking schema
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "booking"."BookingType"            AS ENUM ('player_match', 'player_free_play', 'maintenance', 'weather_closed', 'staff_blocked', 'tournament_match');
CREATE TYPE "booking"."BookingCreationMode"    AS ENUM ('direct', 'staff_approval', 'staff_assisted');
CREATE TYPE "booking"."BookingStatus"          AS ENUM ('pending', 'confirmed', 'cancelled', 'no_show', 'completed');
CREATE TYPE "booking"."MatchType"              AS ENUM ('singles', 'doubles');
CREATE TYPE "booking"."BookingSeriesFrequency" AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE "booking"."BookingSeriesStatus"    AS ENUM ('active', 'cancelled');

-- bookings
ALTER TABLE "booking"."bookings"
  ALTER COLUMN "booking_type" TYPE "booking"."BookingType"
  USING "booking_type"::"booking"."BookingType";
ALTER TABLE "booking"."bookings"
  ALTER COLUMN "booking_type" SET DEFAULT 'player_match'::"booking"."BookingType";

ALTER TABLE "booking"."bookings"
  ALTER COLUMN "creation_mode" TYPE "booking"."BookingCreationMode"
  USING "creation_mode"::"booking"."BookingCreationMode";

ALTER TABLE "booking"."bookings"
  ALTER COLUMN "status" TYPE "booking"."BookingStatus"
  USING "status"::"booking"."BookingStatus";
ALTER TABLE "booking"."bookings"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"booking"."BookingStatus";

ALTER TABLE "booking"."bookings"
  ALTER COLUMN "match_type" TYPE "booking"."MatchType"
  USING "match_type"::"booking"."MatchType";

-- booking_series
ALTER TABLE "booking"."booking_series"
  ALTER COLUMN "frequency" TYPE "booking"."BookingSeriesFrequency"
  USING "frequency"::"booking"."BookingSeriesFrequency";

ALTER TABLE "booking"."booking_series"
  ALTER COLUMN "booking_type" TYPE "booking"."BookingType"
  USING "booking_type"::"booking"."BookingType";
ALTER TABLE "booking"."booking_series"
  ALTER COLUMN "booking_type" SET DEFAULT 'player_match'::"booking"."BookingType";

ALTER TABLE "booking"."booking_series"
  ALTER COLUMN "status" TYPE "booking"."BookingSeriesStatus"
  USING "status"::"booking"."BookingSeriesStatus";
ALTER TABLE "booking"."booking_series"
  ALTER COLUMN "status" SET DEFAULT 'active'::"booking"."BookingSeriesStatus";
