-- 0017_happy_hours: two Settings → Happy hours switches.
--
-- happy_charge: with automatic charging on, charge the battery during every
-- happy hour the user booked with Octopus, at its own rate and up to its own
-- level. Its times go on the inverter 30 minutes before it starts (Growatt's
-- charge times repeat every day) and come off when it ends.
--
-- happy_export: before a booked happy hour, export just enough of the battery
-- that it can fill back up for free during it, finishing as the happy hour
-- starts. It skips like Automatic export does (car plugged in, battery below
-- the minimum, too late or too short), and puts the user's own export times
-- back once it ends.
--
-- Both need automatic charging on, so the schedule functions don't change.
-- app_server's existing table grants already cover the new columns. Run this
-- before deploying the code that reads them.
alter table private.user_settings
  add column happy_charge boolean not null default false,
  add column happy_charge_power smallint
    check (happy_charge_power between 1 and 100),
  add column happy_charge_stop smallint
    check (happy_charge_stop between 1 and 100),
  add column happy_export boolean not null default false,
  add column happy_export_power smallint
    check (happy_export_power between 1 and 100),
  add column happy_export_stop smallint
    check (happy_export_stop between 1 and 100),
  add column happy_export_min_soc smallint
    check (happy_export_min_soc between 1 and 100),
  add constraint happy_export_min_above_stop
    check (happy_export_min_soc > happy_export_stop),
  add constraint happy_export_needs_charge
    check (not happy_export or happy_charge);

-- happy_export_for: the start of the happy hour the export last ran, was
-- skipped or was given up for, so it runs at most once for each.
-- happy_export_code: why the last try failed, so a failure is logged once.
-- happy_export_target: the battery level that export stops at, so it can be
-- raised if part of the happy hour is cancelled while it runs.
-- one_off_restore_*: the export times to put back when the one-off export
-- before a happy hour ends (the user's own, minus any during the happy hour).
alter table private.automation_state
  add column happy_export_for timestamptz,
  add column happy_export_code text
    check (char_length(happy_export_code) <= 40),
  add column happy_export_target smallint
    check (happy_export_target between 1 and 100),
  add column one_off_restore_power smallint
    check (one_off_restore_power between 0 and 100),
  add column one_off_restore_stop smallint
    check (one_off_restore_stop between 0 and 100),
  add column one_off_restore_slots text
    check (char_length(one_off_restore_slots) <= 100);
