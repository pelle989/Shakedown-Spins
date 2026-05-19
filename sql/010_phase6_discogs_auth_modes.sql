-- Phase 6: Discogs auth mode normalization
--
-- Goals:
-- - keep one Discogs connection row per user
-- - make the auth method explicit
-- - support personal token now and OAuth later

alter table discogs_connections
  add column if not exists auth_mode text;

update discogs_connections
set auth_mode = 'personal_token'
where auth_mode is null;

alter table discogs_connections
  alter column auth_mode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discogs_connections_auth_mode_check'
  ) then
    alter table discogs_connections
      add constraint discogs_connections_auth_mode_check
      check (auth_mode in ('personal_token', 'oauth'));
  end if;
end $$;

alter table discogs_connections
  alter column oauth_token_secret drop not null;

alter table discogs_connections
  add column if not exists discogs_user_id text;
