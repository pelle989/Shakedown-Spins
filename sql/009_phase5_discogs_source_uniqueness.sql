-- Phase 5: Discogs source uniqueness guardrail
--
-- Goals:
-- - keep exactly one Discogs source row per user
-- - clean up accidental duplicates before enforcing the rule
-- - allow users to keep multiple CSV/private sources unchanged

with ranked_discogs_sources as (
  select
    id,
    user_id,
    row_number() over (
      partition by user_id
      order by updated_at desc, created_at desc, id desc
    ) as duplicate_rank
  from sources
  where kind = 'discogs'
)
delete from sources
where id in (
  select id
  from ranked_discogs_sources
  where duplicate_rank > 1
);

create unique index if not exists sources_one_discogs_per_user_idx
  on sources (user_id)
  where kind = 'discogs';
