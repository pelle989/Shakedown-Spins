create table if not exists "member_messages" (
  "id" uuid primary key default gen_random_uuid() not null,
  "sender_user_id" uuid not null references "users"("id") on delete cascade,
  "recipient_user_id" uuid not null references "users"("id") on delete cascade,
  "shared_source_id" uuid references "sources"("id") on delete set null,
  "body" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null
);

create index if not exists "member_messages_recipient_created_idx"
  on "member_messages" using btree ("recipient_user_id", "created_at");

create index if not exists "member_messages_sender_created_idx"
  on "member_messages" using btree ("sender_user_id", "created_at");

create index if not exists "member_messages_shared_source_idx"
  on "member_messages" using btree ("shared_source_id");

create index if not exists "member_messages_recipient_read_idx"
  on "member_messages" using btree ("recipient_user_id", "read_at");
