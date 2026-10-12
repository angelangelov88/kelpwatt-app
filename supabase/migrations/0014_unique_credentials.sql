-- 0014_unique_credentials: one Kelpwatt account per inverter and per Octopus
-- account. Two accounts on one inverter overwrite each other's charge and
-- export times every check, so a second account can't save the same Growatt
-- serial or Octopus account number (api/credentials.ts turns this into a 409).
-- Ignores case, as serials are saved as typed.
--
-- Fails if two accounts already share one. Find them first (counts only):
--   select provider, count(*) from private.user_credentials
--   group by provider, upper(identifier) having count(*) > 1;
create unique index user_credentials_identifier_key
  on private.user_credentials (provider, upper(identifier));
