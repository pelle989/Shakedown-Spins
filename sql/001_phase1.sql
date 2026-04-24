create extension if not exists pgcrypto;

create table if not exists stashes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  album_count integer not null check (album_count > 0),
  stash_preview_json jsonb not null default '[]'::jsonb,
  constraint stashes_name_nonempty check (length(trim(name)) > 0),
  constraint stashes_name_length check (length(name) <= 100)
);

create table if not exists stash_albums (
  id uuid primary key default gen_random_uuid(),
  stash_id uuid not null references stashes(id) on delete cascade,
  row_order integer not null check (row_order >= 0),
  artist text not null,
  title text not null,
  year integer,
  genre text[] not null default '{}',
  label text,
  format text,
  discogs_id text,
  notes text,
  unique (stash_id, row_order)
);

create table if not exists rate_limit_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stashes_created_at on stashes (created_at desc);
create index if not exists idx_stash_albums_stash_id on stash_albums (stash_id, row_order);
create index if not exists idx_rate_limit_ip_created on rate_limit_log (ip_hash, created_at desc);

create or replace function create_stash(
  p_name text,
  p_albums jsonb,
  p_ip_hash text
)
returns table (
  outcome text,
  id uuid,
  name text,
  album_count integer,
  created_at timestamptz,
  stash_preview_json jsonb
)
language plpgsql
security definer
as $$
declare
  v_stash_id uuid;
  v_album_count integer;
  v_preview jsonb;
  v_created_at timestamptz;
begin
  perform pg_advisory_xact_lock(4815162342);

  delete from rate_limit_log
  where ip_hash = p_ip_hash
    and created_at < now() - interval '1 hour';

  if (
    select count(*)
    from rate_limit_log
    where ip_hash = p_ip_hash
      and created_at > now() - interval '1 hour'
  ) >= 3 then
    return query
    select 'rate_limited'::text, null::uuid, null::text, null::integer, null::timestamptz, null::jsonb;
    return;
  end if;

  v_album_count := coalesce(jsonb_array_length(p_albums), 0);
  if v_album_count <= 0 then
    raise exception 'No valid albums supplied';
  end if;

  v_preview := (
    with album_rows as (
      select
        value ->> 'artist' as artist,
        value ->> 'title' as title,
        nullif(value ->> 'year', '')::integer as year,
        coalesce(value -> 'genre', '[]'::jsonb) as genre,
        row_number() over () as row_num
      from jsonb_array_elements(p_albums)
    ),
    ranked as (
      select *,
        row_number() over (
          partition by coalesce((genre ->> 0), 'ungrouped'), coalesce(((year / 10) * 10)::text, 'unknown')
          order by row_num
        ) as diversity_rank
      from album_rows
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'artist', artist,
          'title', title,
          'year', year,
          'genre', genre
        )
        order by row_num
      ),
      '[]'::jsonb
    )
    from (
      select artist, title, year, genre, row_num
      from ranked
      where diversity_rank = 1
      order by row_num
      limit 5
    ) preview
  );

  insert into stashes (name, album_count, stash_preview_json)
  values (p_name, v_album_count, v_preview)
  returning stashes.id, stashes.created_at into v_stash_id, v_created_at;

  insert into stash_albums (
    stash_id,
    row_order,
    artist,
    title,
    year,
    genre,
    label,
    format,
    discogs_id,
    notes
  )
  select
    v_stash_id,
    row_number() over () - 1,
    value ->> 'artist',
    value ->> 'title',
    nullif(value ->> 'year', '')::integer,
    coalesce(array(select jsonb_array_elements_text(coalesce(value -> 'genre', '[]'::jsonb))), '{}'),
    nullif(value ->> 'label', ''),
    nullif(value ->> 'format', ''),
    nullif(value ->> 'discogsId', ''),
    nullif(value ->> 'notes', '')
  from jsonb_array_elements(p_albums);

  insert into rate_limit_log (ip_hash) values (p_ip_hash);

  delete from stashes
  where id in (
    select id
    from stashes
    order by created_at desc
    offset 10
  );

  return query
  select
    'created'::text,
    s.id,
    s.name,
    s.album_count,
    s.created_at,
    s.stash_preview_json
  from stashes s
  where s.id = v_stash_id;
end;
$$;
