-- 0016_failure_notify: fewer "Automatic charging stopped working"
-- notifications. A check that fails and is fixed by the next one isn't
-- worth a buzz in the night, so a failure is only sent straight away when it
-- needs the user (a refused login), and otherwise once it has lasted 30
-- minutes. "Working again" is only sent after one of those.
--
-- failing_since: when the current run of failed checks started, null when the
-- last check worked. failure_notified: a notification was sent for it.
--
-- Run this before deploying the code that reads them.
alter table private.automation_state
  add column failing_since timestamptz,
  add column failure_notified boolean not null default false;
