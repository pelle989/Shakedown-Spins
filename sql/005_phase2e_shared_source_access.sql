-- Phase 2E: durable Friends Stash access
-- Run this after 002_phase2a_auth_and_sources.sql and 004_phase2d_owner_profiles.sql.

create table if not exists "shared_source_access" (
  "id" uuid primary key default gen_random_uuid() not null,
  "source_id" uuid not null references "sources"("id") on delete cascade,
  "recipient_user_id" uuid not null references "users"("id") on delete cascade,
  "created_at" timestamp with time zone default now() not null,
  constraint "shared_source_access_source_recipient_unique" unique ("source_id", "recipient_user_id")
);

create index if not exists "shared_source_access_recipient_idx"
  on "shared_source_access" using btree ("recipient_user_id", "created_at");

create index if not exists "shared_source_access_source_idx"
  on "shared_source_access" using btree ("source_id");
