-- Phase 5B: user UI preferences
--
-- Run this after:
-- 002_phase2a_auth_and_sources.sql
-- 004_phase2d_owner_profiles.sql
--
-- Adds lightweight server-side persistence for UI preferences such as:
-- - friend stash load mode
-- - friend stash compare source
-- - welcome modal dismissed state

create table if not exists "user_ui_preferences" (
  "id" uuid primary key default gen_random_uuid() not null,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "key" text not null,
  "value" text not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "user_ui_preferences_user_key_unique" unique ("user_id", "key")
);

create index if not exists "user_ui_preferences_user_updated_idx"
  on "user_ui_preferences" using btree ("user_id", "updated_at");
