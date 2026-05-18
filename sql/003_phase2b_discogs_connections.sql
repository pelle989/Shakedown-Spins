-- Phase 2B: Discogs connection storage
--
-- Run this after:
-- 1. Phase 1 schema
-- 2. Phase 2A auth and sources schema
--
-- This script adds the user-owned Discogs OAuth connection table.

create extension if not exists pgcrypto;

create table if not exists "discogs_connections" (
  "id" uuid primary key default gen_random_uuid() not null,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "username" text not null,
  "oauth_token" text not null,
  "oauth_token_secret" text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "discogs_connections_user_id_unique" unique ("user_id")
);

create index if not exists "discogs_connections_username_idx"
  on "discogs_connections" using btree ("username");
