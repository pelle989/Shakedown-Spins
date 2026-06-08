-- Phase 6B: public profile and retention hardening
--
-- Run this after:
-- 004_phase2d_owner_profiles.sql
-- 006_phase2f_member_messages.sql
-- 007_phase5_cleanup_and_retention.sql
-- 008_phase5_ui_preferences_and_cleanup_endpoint.sql
--
-- Adds:
-- - normalized handle backfill
-- - public handle format and uniqueness guarantees
-- - constrained server-side UI preference keys
-- - safer message cleanup that keeps shared-stash messages reusable

update "users"
set "handle" = null
where "handle" is not null
  and length(trim("handle")) = 0;

update "users"
set "handle" = lower(
  regexp_replace(
    regexp_replace(trim("handle"), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  )
)
where "handle" is not null;

update "users"
set "handle" = null
where "handle" is not null
  and "handle" !~ '^[a-z0-9]+(-[a-z0-9]+)*$';

with ranked_handles as (
  select
    "id",
    row_number() over (partition by lower("handle") order by "created_at", "id") as handle_rank
  from "users"
  where "handle" is not null
    and length(trim("handle")) > 0
)
update "users"
set "handle" = null
from ranked_handles
where "users"."id" = ranked_handles."id"
  and ranked_handles.handle_rank > 1;

alter table "users"
  drop constraint if exists "users_handle_format_check";

alter table "users"
  add constraint "users_handle_format_check"
  check ("handle" is null or "handle" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

create unique index if not exists "users_handle_unique_idx"
  on "users" (lower("handle"))
  where "handle" is not null and length(trim("handle")) > 0;

alter table "user_ui_preferences"
  drop constraint if exists "user_ui_preferences_key_check";

alter table "user_ui_preferences"
  add constraint "user_ui_preferences_key_check"
  check ("key" in ('welcome_seen', 'friend_load_modes', 'friend_shelf_sources'));

create or replace function preview_phase5_cleanup(
  p_now timestamptz default now(),
  p_rate_limit_retention interval default interval '1 day',
  p_member_message_retention interval default interval '30 days'
)
returns table (
  target text,
  candidate_count bigint
)
language sql
security definer
as $$
  select 'sessions'::text, count(*)::bigint
  from "sessions"
  where "expires" < p_now

  union all

  select 'verification_tokens'::text, count(*)::bigint
  from "verification_tokens"
  where "expires" < p_now

  union all

  select 'rate_limit_log'::text, count(*)::bigint
  from "rate_limit_log"
  where "created_at" < p_now - p_rate_limit_retention

  union all

  select 'member_messages'::text, count(*)::bigint
  from "member_messages"
  where "created_at" < p_now - p_member_message_retention
    and "shared_source_id" is null
$$;

create or replace function run_phase5_cleanup(
  p_now timestamptz default now(),
  p_rate_limit_retention interval default interval '1 day',
  p_member_message_retention interval default interval '30 days'
)
returns table (
  target text,
  deleted_count integer
)
language plpgsql
security definer
as $$
declare
  v_deleted integer;
begin
  delete from "sessions"
  where "expires" < p_now;
  get diagnostics v_deleted = row_count;
  target := 'sessions';
  deleted_count := v_deleted;
  return next;

  delete from "verification_tokens"
  where "expires" < p_now;
  get diagnostics v_deleted = row_count;
  target := 'verification_tokens';
  deleted_count := v_deleted;
  return next;

  delete from "rate_limit_log"
  where "created_at" < p_now - p_rate_limit_retention;
  get diagnostics v_deleted = row_count;
  target := 'rate_limit_log';
  deleted_count := v_deleted;
  return next;

  delete from "member_messages"
  where "created_at" < p_now - p_member_message_retention
    and "shared_source_id" is null;
  get diagnostics v_deleted = row_count;
  target := 'member_messages';
  deleted_count := v_deleted;
  return next;
end;
$$;
