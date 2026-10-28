-- Per-account listening state. Album history events merge atomically under a row lock.
create table if not exists listening_states (
  user_id uuid primary key references users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
