-- 0015_push: push notifications for some activity entries (failures, Automatic
-- export, finished exports, security changes and the morning charging
-- summary), on each device the user turns them on for.
--
-- Nothing new is written where activity happens. Once a minute, pg_cron asks
-- /api/cron/notify to send pushes for new audit_log rows, but only when there
-- are some for users with a device turned on. push_state remembers how far
-- it got. The notifications themselves aren't stored: the text is built from
-- the audit_log row when it's sent.
--
-- Needs the cron secret in Vault, as 0007_automation.sql.

-- One row per device (browser or installed app) with notifications on. The
-- endpoint is an address at the browser's push service (Google, Apple,
-- Mozilla or Microsoft); p256dh and auth encrypt each message for that device.
create table private.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null check (length(endpoint) <= 1000),
  p256dh text not null check (length(p256dh) <= 200),
  auth text not null check (length(auth) <= 100),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  unique (user_id, endpoint)
);

alter table private.push_subscriptions enable row level security;
alter table private.push_subscriptions force row level security;
revoke all on private.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on private.push_subscriptions
  to app_server;
create policy own_rows on private.push_subscriptions to app_server
  using (user_id = private.current_user_id())
  with check (user_id = private.current_user_id());

-- A browser shared by two accounts has one push address. When one of them
-- turns notifications on, the other loses it, so it can't get their
-- notifications if they didn't log out. Called inside withUser.
create or replace function private.claim_push_endpoint(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.push_subscriptions
  where endpoint = p_endpoint and user_id <> private.current_user_id()
$$;
revoke all on function private.claim_push_endpoint(text)
  from public, anon, authenticated;
grant execute on function private.claim_push_endpoint(text) to app_server;

-- Which kinds of notification the user wants, on every device they've turned
-- on. app_server's existing table grants already cover the new columns.
alter table private.user_settings
  add column notify_failures boolean not null default true,
  add column notify_automatic_export boolean not null default true,
  add column notify_exports boolean not null default true,
  add column notify_security boolean not null default true,
  add column notify_summary boolean not null default true;

-- The UK date the morning charging summary was last written.
alter table private.automation_state add column summary_on date;

-- The last audit_log id looked at for pushes. One row, only changed by the
-- functions below. Starts at the newest row, so nothing old is sent.
create table private.push_state (
  id boolean primary key default true check (id),
  last_audit_id bigint not null
);
insert into private.push_state (last_audit_id)
  select coalesce(max(id), 0) from private.audit_log
  on conflict do nothing;
alter table private.push_state enable row level security;
alter table private.push_state force row level security;
revoke all on private.push_state from public, anon, authenticated;

-- Audit rows are written in short transactions, so rows older than 15 seconds
-- can't still be waiting to appear behind ones already seen. Rows are only
-- sent within an hour, so a stalled timer doesn't send old news later.

-- True when there are new audit rows for users with a device turned on.
create or replace function private.push_pending()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select from private.audit_log a
    where a.id > (select last_audit_id from private.push_state)
      and a.created_at < now() - interval '15 seconds'
      and exists (
        select from private.push_subscriptions s where s.user_id = a.user_id
      )
  )
$$;
revoke all on function private.push_pending() from public, anon, authenticated;
grant execute on function private.push_pending() to app_server;

-- Takes up to p_limit new audit rows and moves past them, then returns the
-- ones for users with a device turned on (never the IP: from_schedule says
-- whether it was the scheduled check). Taking them first means two runs at
-- once can't send the same row twice.
create or replace function private.take_push_rows(p_limit integer)
returns table (
  id bigint,
  user_id uuid,
  action text,
  details jsonb,
  from_schedule boolean
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_from bigint;
  v_to bigint;
begin
  select ps.last_audit_id into v_from from private.push_state ps for update;
  select max(t.id) into v_to from (
    select a.id from private.audit_log a
    where a.id > v_from and a.created_at < now() - interval '15 seconds'
    order by a.id
    limit p_limit
  ) t;
  if v_to is null then
    return;
  end if;
  update private.push_state set last_audit_id = v_to;
  return query
    select a.id, a.user_id, a.action, a.details, a.ip is null
    from private.audit_log a
    where a.id > v_from and a.id <= v_to
      and a.created_at > now() - interval '1 hour'
      and exists (
        select from private.push_subscriptions s where s.user_id = a.user_id
      )
    order by a.id;
end;
$$;
revoke all on function private.take_push_rows(integer)
  from public, anon, authenticated;
grant execute on function private.take_push_rows(integer) to app_server;

-- Run by the timer below as postgres, which can read the secret from Vault.
-- Asks the API to send only when there's something to send; otherwise moves
-- past the new rows, so the next look starts from here. Returns whether it
-- asked.
create or replace function private.schedule_push()
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_secret text;
begin
  if not private.push_pending() then
    update private.push_state set last_audit_id = greatest(
      last_audit_id,
      coalesce(
        (select max(id) from private.audit_log
          where created_at < now() - interval '15 seconds'),
        0
      )
    );
    return false;
  end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then
    raise exception 'cron_secret is missing from Vault';
  end if;
  perform net.http_post(
    url := 'https://kelpwatt.angelov.uk/api/cron/notify',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 60000
  );
  return true;
end;
$$;
revoke all on function private.schedule_push()
  from public, anon, authenticated;

-- cron.schedule replaces a job with the same name, so this file can be run again.
select cron.schedule(
  'push-notify',
  '* * * * *',
  'select private.schedule_push()'
);
