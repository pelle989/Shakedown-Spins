alter table "user_ui_preferences"
  drop constraint if exists "user_ui_preferences_key_check";

alter table "user_ui_preferences"
  add constraint "user_ui_preferences_key_check"
  check ("key" in ('welcome_seen', 'welcome_seen_at', 'friend_load_modes', 'friend_shelf_sources'));

insert into "user_ui_preferences" ("user_id", "key", "value", "updated_at")
select "user_id", 'welcome_seen_at', "updated_at"::text, now()
from "user_ui_preferences"
where "key" = 'welcome_seen'
  and lower("value") = 'true'
on conflict ("user_id", "key") do nothing;
