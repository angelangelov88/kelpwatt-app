-- 0018_happy_hours_fixes: follow-ups to 0017_happy_hours.
--
-- The export levels only have to make sense while the export is on: with it
-- off, its dropdowns are hidden, so a saved "only run if at least" at or
-- below "never below" couldn't be fixed and blocked saving the charge
-- settings.
alter table private.user_settings
  drop constraint happy_export_min_above_stop,
  add constraint happy_export_min_above_stop
    check (not happy_export or happy_export_min_soc > happy_export_stop);

-- happy_bookings: the happy hours the user had booked that hadn't ended, as
-- of the last time Octopus sent them ("start/end, …" in ISO form). Used to
-- keep charging during them when a check can't load the bookings, so a
-- failure there doesn't stop automatic charging or drop a happy hour's
-- charge times. happy_charge_code: why loading the bookings for charging
-- last failed, so the failure is logged once; null when it worked.
alter table private.automation_state
  add column happy_bookings text
    check (char_length(happy_bookings) <= 500),
  add column happy_charge_code text
    check (char_length(happy_charge_code) <= 40);
