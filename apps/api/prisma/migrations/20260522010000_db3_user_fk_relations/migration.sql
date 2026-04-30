-- DB-3: FK constraints para todos os campos UUID que apontam para users
-- sem constraint de integridade referencial no banco.
-- ON DELETE SET NULL: preserva o registro; apenas o ponteiro vira NULL.
-- ON DELETE RESTRICT: campos NOT NULL (ex: createdById em booking_series).

-- ─── identity schema ──────────────────────────────────────────────────────────

ALTER TABLE "identity"."memberships"
  ADD CONSTRAINT "memberships_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "identity"."role_assignments"
  ADD CONSTRAINT "role_assignments_granted_by_fkey"
  FOREIGN KEY ("granted_by") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── klub schema ──────────────────────────────────────────────────────────────

ALTER TABLE "klub"."klubs"
  ADD CONSTRAINT "klubs_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klubs"
  ADD CONSTRAINT "klubs_review_decided_by_id_fkey"
  FOREIGN KEY ("review_decided_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klubs"
  ADD CONSTRAINT "klubs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_configs"
  ADD CONSTRAINT "klub_configs_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_configs"
  ADD CONSTRAINT "klub_configs_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_sport_profiles"
  ADD CONSTRAINT "klub_sport_profiles_added_by_id_fkey"
  FOREIGN KEY ("added_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_sport_profiles"
  ADD CONSTRAINT "klub_sport_profiles_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."player_sport_enrollments"
  ADD CONSTRAINT "player_sport_enrollments_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."player_sport_enrollments"
  ADD CONSTRAINT "player_sport_enrollments_suspended_by_id_fkey"
  FOREIGN KEY ("suspended_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."player_sport_enrollments"
  ADD CONSTRAINT "player_sport_enrollments_cancelled_by_id_fkey"
  FOREIGN KEY ("cancelled_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."player_sport_enrollments"
  ADD CONSTRAINT "player_sport_enrollments_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_sport_rankings"
  ADD CONSTRAINT "klub_sport_rankings_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_sport_rankings"
  ADD CONSTRAINT "klub_sport_rankings_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."match_results"
  ADD CONSTRAINT "match_results_confirmed_by_id_fkey"
  FOREIGN KEY ("confirmed_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."match_results"
  ADD CONSTRAINT "match_results_validated_by_id_fkey"
  FOREIGN KEY ("validated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."ranking_points_schemas"
  ADD CONSTRAINT "ranking_points_schemas_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."ranking_points_schemas"
  ADD CONSTRAINT "ranking_points_schemas_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournaments"
  ADD CONSTRAINT "tournaments_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournaments"
  ADD CONSTRAINT "tournaments_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournaments"
  ADD CONSTRAINT "tournaments_cancelled_by_id_fkey"
  FOREIGN KEY ("cancelled_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_categories"
  ADD CONSTRAINT "tournament_categories_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_categories"
  ADD CONSTRAINT "tournament_categories_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_matches"
  ADD CONSTRAINT "tournament_matches_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_entries"
  ADD CONSTRAINT "tournament_entries_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."tournament_entries"
  ADD CONSTRAINT "tournament_entries_moved_by_id_fkey"
  FOREIGN KEY ("moved_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "klub"."klub_requests"
  ADD CONSTRAINT "klub_requests_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── space schema ─────────────────────────────────────────────────────────────

ALTER TABLE "space"."spaces"
  ADD CONSTRAINT "spaces_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "space"."spaces"
  ADD CONSTRAINT "spaces_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── booking schema ───────────────────────────────────────────────────────────

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_primary_player_id_fkey"
  FOREIGN KEY ("primary_player_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_rejected_by_id_fkey"
  FOREIGN KEY ("rejected_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_cancelled_by_id_fkey"
  FOREIGN KEY ("cancelled_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."bookings"
  ADD CONSTRAINT "bookings_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."booking_series"
  ADD CONSTRAINT "booking_series_primary_player_id_fkey"
  FOREIGN KEY ("primary_player_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."booking_series"
  ADD CONSTRAINT "booking_series_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "identity"."users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"."booking_series"
  ADD CONSTRAINT "booking_series_cancelled_by_id_fkey"
  FOREIGN KEY ("cancelled_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"."booking_series"
  ADD CONSTRAINT "booking_series_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "identity"."users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
