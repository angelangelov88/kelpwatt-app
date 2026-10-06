import { z } from "zod";
import { createGrowattClient } from "../../src/lib/growattApi";
import type { Provider } from "../../src/types/Server";
import { decryptSecret, encryptSecret } from "./crypto";
import { withUser } from "./db";

const GROWATT_BASE = "https://server.growatt.com";

// What each provider's encrypted secret holds, as JSON. Checked on the way out,
// so a bad row fails loudly instead of sending junk to Growatt or Octopus.
const secretSchemas = {
  growatt: z.object({
    user: z.string().min(1),
    // Growatt's login only needs MD5(password), so the password itself is never stored.
    passwordMd5: z.string().regex(/^[0-9a-f]{32}$/),
  }),
  octopus: z.object({ apiKey: z.string().min(1) }),
};

type Secrets = { [P in Provider]: z.infer<(typeof secretSchemas)[P]> };

type CredentialsRow = {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  auth_tag: Uint8Array;
  key_version: number;
  identifier: string;
};

// Encrypts a provider's secret for saving. Bound to the user and provider.
const sealSecret = <P extends Provider>(
  userId: string,
  provider: P,
  secret: Secrets[P],
) => encryptSecret(JSON.stringify(secret), userId, provider);

// Loads and decrypts one provider's credentials, or null if none are saved.
// identifier is the Growatt serial or the Octopus account number.
const loadCredentials = async <P extends Provider>(
  userId: string,
  provider: P,
): Promise<{ identifier: string; secret: Secrets[P] } | null> => {
  const rows = await withUser(
    userId,
    (tx) => tx<CredentialsRow[]>`
      select ciphertext, iv, auth_tag, key_version, identifier
      from private.user_credentials where provider = ${provider}`,
  );
  const row = rows.at(0);
  if (!row) return null;
  const plaintext = decryptSecret(
    {
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.auth_tag,
      keyVersion: row.key_version,
    },
    userId,
    provider,
  );
  const secret = secretSchemas[provider].parse(JSON.parse(plaintext));
  return { identifier: row.identifier, secret: secret as Secrets[P] };
};

// A Growatt client for one user. Its session lives only in this client, so it
// is never shared with another user's requests. deadline: when it stops
// calling Growatt (epoch ms).
const growattClientFor = (secret: Secrets["growatt"], deadline?: number) =>
  createGrowattClient({
    user: secret.user,
    passwordMd5: secret.passwordMd5,
    buildUrl: (path) => `${GROWATT_BASE}${path}`,
    deadline,
  });

// The user's Growatt client and inverter serial, or null if not set up.
const loadGrowatt = async (userId: string, deadline?: number) => {
  const creds = await loadCredentials(userId, "growatt");
  if (!creds) return null;
  return {
    serial: creds.identifier,
    client: growattClientFor(creds.secret, deadline),
  };
};

// The user's Octopus API key and account number, or null if not set up.
const loadOctopus = async (userId: string) => {
  const creds = await loadCredentials(userId, "octopus");
  if (!creds) return null;
  return { account: creds.identifier, apiKey: creds.secret.apiKey };
};

export { sealSecret, growattClientFor, loadGrowatt, loadOctopus };
export type { Secrets };
