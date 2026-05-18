-- Phase 2D: shared collection owner identity
-- Run this after 002_phase2a_auth_and_sources.sql.

alter table if exists "users"
  add column if not exists "public_profile_name" text;

alter table if exists "users"
  add column if not exists "handle" text;
