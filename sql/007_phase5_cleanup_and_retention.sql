-- Phase 5: cleanup and retention maintenance
--
-- Run this after:
-- 001_phase1.sql
-- 002_phase2a_auth_and_sources.sql
-- 005_phase2e_shared_source_access.sql
-- 006_phase2f_member_messages.sql
--
-- This script is safe to run manually in Neon SQL Editor.
-- It adds:
-- - helper indexes for global age-based cleanup
-- - a preview function
-- - a cleanup function

create index if not exists "rate_limit_log_created_at_idx"
  on "rate_limit_log" using btree ("created_at");

create index if not exists "member_messages_created_at_idx"
  on "member_messages" using btree ("created_at");

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
  where "created_at" < p_now - p_member_message_retention;
  get diagnostics v_deleted = row_count;
  target := 'member_messages';
  deleted_count := v_deleted;
  return next;
end;
$$;
