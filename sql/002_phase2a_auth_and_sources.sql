-- Phase 2A: Auth.js + Drizzle auth tables and Shakedown Spins source tables
--
-- Run this after the Phase 1 schema has already been applied.
-- This script is intended for manual use in Neon SQL Editor.
--
-- Notes:
-- - Keep the existing Phase 1 tables and create_stash(...) function as-is.
-- - Run this script separately from Phase 1.
-- - Use Neon "Run", not "Explain".
-- - Do not add Drizzle statement markers to this file.

create extension if not exists pgcrypto;

create table if not exists "users" (
  "id" uuid primary key default gen_random_uuid() not null,
  "email" text not null,
  "email_verified" timestamp with time zone,
  "name" text,
  "image" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "users_email_unique" unique ("email")
);

create table if not exists "accounts" (
  "id" uuid primary key default gen_random_uuid() not null,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "type" text not null,
  "provider" text not null,
  "provider_account_id" text not null,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  "oauth_token_secret" text,
  "oauth_token" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "accounts_provider_provider_account_id_unique" unique ("provider", "provider_account_id")
);

create table if not exists "sessions" (
  "session_token" text primary key not null,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "expires" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

create table if not exists "verification_tokens" (
  "identifier" text not null,
  "token" text not null,
  "expires" timestamp with time zone not null,
  constraint "verification_tokens_identifier_token_pk" primary key ("identifier", "token"),
  constraint "verification_tokens_token_unique" unique ("token")
);

create table if not exists "sources" (
  "id" uuid primary key default gen_random_uuid() not null,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "kind" text not null,
  "name" text not null,
  "visibility" text default 'private' not null,
  "sync_status" text default 'ready' not null,
  "last_synced_at" timestamp with time zone,
  "album_count" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "sources_visibility_check" check ("visibility" in ('private', 'shared')),
  constraint "sources_sync_status_check" check ("sync_status" in ('ready', 'syncing', 'error')),
  constraint "sources_album_count_check" check ("album_count" >= 0),
  constraint "sources_name_nonempty_check" check (length(trim("name")) > 0),
  constraint "sources_name_length_check" check (length("name") <= 100)
);

create table if not exists "source_albums" (
  "id" uuid primary key default gen_random_uuid() not null,
  "source_id" uuid not null references "sources"("id") on delete cascade,
  "row_order" integer not null,
  "artist" text not null,
  "title" text not null,
  "year" integer,
  "genre" text[] default '{}' not null,
  "label" text,
  "format" text,
  "discogs_id" text,
  "notes" text,
  "cover_image_url" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "source_albums_source_row_unique" unique ("source_id", "row_order"),
  constraint "source_albums_row_order_check" check ("row_order" >= 0)
);

create index if not exists "accounts_user_id_idx" on "accounts" using btree ("user_id");
create index if not exists "sessions_user_id_idx" on "sessions" using btree ("user_id");
create index if not exists "sessions_expires_idx" on "sessions" using btree ("expires");
create index if not exists "source_albums_source_row_idx" on "source_albums" using btree ("source_id", "row_order");
create index if not exists "sources_user_created_idx" on "sources" using btree ("user_id", "created_at");
create index if not exists "sources_user_updated_idx" on "sources" using btree ("user_id", "updated_at");
create index if not exists "sources_user_visibility_idx" on "sources" using btree ("user_id", "visibility");
create index if not exists "verification_tokens_expires_idx" on "verification_tokens" using btree ("expires");
