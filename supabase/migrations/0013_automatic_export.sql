-- 0013_automatic_export: Export until battery % every evening, at a time the
-- user picks (Settings → Automatic export).
--
-- The 5-minute check starts it within 5 minutes of that time, unless the car
-- is plugged in (Intelligent Octopus has charging planned), the battery is
-- below the user's minimum, or the export would be too short. It then sets the
-- same one-off slot as the dashboard's button, which the check turns off once
-- it ends. app_server's existing table grants already cover the new columns.

-- On or off, the time (UK, no later than 23:00, as Growatt clears export times
-- at 23:30), the discharge rate and stop level, and the lowest battery level
-- it starts at.
alter table private.user_settings
  add column automatic_export boolean not null default false,
  add column automatic_export_at time
    check (automatic_export_at <= '23:00'),
  add column automatic_export_power smallint
    check (automatic_export_power between 1 and 100),
  add column automatic_export_stop smallint
    check (automatic_export_stop between 1 and 100),
  add column automatic_export_min_soc smallint
    check (automatic_export_min_soc between 1 and 100),
  add constraint automatic_export_min_above_stop
    check (automatic_export_min_soc > automatic_export_stop);

-- automatic_export_on: the UK day it last ran, was skipped or was given up on,
-- so it runs at most once an evening. automatic_export_code and _message: why
-- tonight's last try failed, logged once it stops trying.
alter table private.automation_state
  add column automatic_export_on date,
  add column automatic_export_code text
    check (char_length(automatic_export_code) <= 40),
  add column automatic_export_message text
    check (char_length(automatic_export_message) <= 300);

-- Now also users with Automatic export on.
create or replace function private.automation_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id from private.user_settings s
  where s.automation_enabled or s.keep_export or s.automatic_export
    or exists (
      select from private.automation_state a
      where a.user_id = s.user_id and a.one_off_until is not null
    )
$$;
revoke all on function private.automation_user_ids() from public;
grant execute on function private.automation_user_ids() to app_server;

-- As in 0011, now also for users with Automatic export on.
create or replace function private.schedule_automation()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_secret text;
  v_user uuid;
  v_count integer := 0;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then
    raise exception 'cron_secret is missing from Vault';
  end if;

  for v_user in
    select s.user_id from private.user_settings s
    where (
        s.automation_enabled or s.keep_export or s.automatic_export
        or exists (
          select from private.automation_state a
          where a.user_id = s.user_id and a.one_off_until is not null
        )
      )
      and not exists (
        select from private.automation_state a
        where a.user_id = s.user_id and a.paused
      )
  loop
    -- Queued, then sent in the background. A check can take up to a minute
    -- (pg_net gives up after 5 seconds by default).
    perform net.http_post(
      url := 'https://kelpwatt.angelov.uk/api/cron/user',
      body := jsonb_build_object('userId', v_user),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      timeout_milliseconds := 60000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function private.schedule_automation()
  from public, anon, authenticated;
