import type {
  ChargePeriod,
  ChargePeriods,
  DischargePeriods,
  GrowattConfig,
  GrowattResponse,
  SlotParam,
} from "../types/Growatt";

// ─── Factory ──────────────────────────────────────────────────────────────────
// Used by the server (one client per user) and the Node script. Each caller
// passes its own credentials and URL builder.

const createGrowattClient = ({
  user,
  passwordMd5,
  buildUrl,
  debug = false,
}: GrowattConfig) => {
  // The session lives only in this client, so on the server one user's Growatt
  // session can never be used for another.
  let sessionCookie = "";
  let loginPromise: Promise<void> | null = null;

  const request = async (
    path: string,
    body?: Record<string, string>,
    isRetry = false,
  ): Promise<GrowattResponse> => {
    const headers: Record<string, string> = {};
    if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (sessionCookie) headers.Cookie = sessionCookie;

    const res = await fetch(buildUrl(path), {
      method: body ? "POST" : "GET",
      headers,
      body: body ? new URLSearchParams(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      const match = /JSESSIONID=[^;]+/.exec(setCookie);
      if (match) sessionCookie = match[0];
    }

    const text = await res.text();
    // Never the login reply: it describes the account.
    if (debug && path !== "/login")
      console.log(`${body ? "POST" : "GET"} ${path}:`, text);
    let json: GrowattResponse;
    try {
      json = JSON.parse(text) as GrowattResponse;
    } catch {
      throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
    }

    // Detect session expiry and retry once. Never for the login itself, which
    // would otherwise log in again and again.
    const msg = json.msg?.toLowerCase() ?? "";
    const isAuthError =
      path !== "/login" &&
      json.success === false &&
      (msg.includes("login") || msg.includes("session"));

    if (!isRetry && isAuthError) {
      sessionCookie = "";
      loginPromise = null;
      await ensureLoggedIn();
      return request(path, body, true);
    }

    if (json.success === false) throw new Error(json.msg ?? "Request failed");

    return json;
  };

  const ensureLoggedIn = () => {
    if (sessionCookie) return Promise.resolve();
    loginPromise ??= request("/login", {
      account: user,
      password: "",
      passwordCrc: passwordMd5,
      validateCode: "",
      isReadPact: "0",
      type: "1",
    })
      .then((data) => {
        loginPromise = null;
        if (data.result !== 1) throw new Error(data.msg ?? "Login failed");
      })
      .catch((err: unknown) => {
        loginPromise = null;
        throw err;
      });
    return loginPromise;
  };

  const readDelay = () => new Promise((resolve) => setTimeout(resolve, 3000));
  const writeDelay = () => new Promise((resolve) => setTimeout(resolve, 10000));

  // The inverter can only handle one tcpSet call at a time, so every read/write
  // goes through this queue, with a gap before the next one starts. The datalogger
  // needs ~2-3s between commands, otherwise reads come back empty.
  const QUEUE_GAP_MS = 3000;
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run
      .catch(() => undefined)
      .then(() => new Promise((resolve) => setTimeout(resolve, QUEUE_GAP_MS)));
    return run;
  };

  const decodeTime = (n: number) => {
    const h = Math.floor(n / 256);
    const m = n % 256;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const safe = (v: number[], offset: number): ChargePeriod =>
    offset < v.length
      ? {
          start: decodeTime(v[offset]),
          end: decodeTime(v[offset + 1]),
          enabled: v[offset + 2] === 1,
        }
      : { start: "--", end: "--", enabled: false };

  const slotParams46 = (
    p4: SlotParam,
    p5: SlotParam,
    p6: SlotParam,
  ): Record<string, string> => ({
    param1: p4?.startHour ?? "00",
    param2: p4?.startMin ?? "00",
    param3: p4?.endHour ?? "00",
    param4: p4?.endMin ?? "00",
    param5: p4 ? "1" : "0",
    param6: p5?.startHour ?? "00",
    param7: p5?.startMin ?? "00",
    param8: p5?.endHour ?? "00",
    param9: p5?.endMin ?? "00",
    param10: p5 ? "1" : "0",
    param11: p6?.startHour ?? "00",
    param12: p6?.startMin ?? "00",
    param13: p6?.endHour ?? "00",
    param14: p6?.endMin ?? "00",
    param15: p6 ? "1" : "0",
  });

  // readMixParam sometimes returns {"success":true,"msg":""} when the datalogger is busy.
  // Treat a missing or short reply as a failure: retry, then throw, never return partial data.
  const READ_ATTEMPTS = 3;
  const READ_RETRY_MS = 3000;
  const readParam = async (
    serial: string,
    paramId: string,
    minLength: number,
  ) => {
    for (let attempt = 1; ; attempt++) {
      const data = await request("/tcpSet.do", {
        action: "readMixParam",
        paramId,
        serialNum: serial,
        startAddr: "-1",
        endAddr: "-1",
      });
      const msg = data.msg ?? "";
      const values = msg.split("-").filter(Boolean).map(Number);
      if (values.length >= minLength && !values.some(Number.isNaN))
        return { msg, values };
      if (attempt >= READ_ATTEMPTS)
        throw new Error(
          `Inverter returned no data for ${paramId} — it may be busy, try again`,
        );
      console.warn(
        `${paramId}: empty reply (attempt ${String(attempt)}/${String(READ_ATTEMPTS)}), retrying in ${String(READ_RETRY_MS / 1000)}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, READ_RETRY_MS));
    }
  };

  // Periods 1-3 plus rate/SOC come from the first param (19 values); 4-6 from the second (9 values),
  // which is only read when 1-3 are all enabled.
  const readPeriods = async (
    serial: string,
    paramId13: string,
    paramId46: string,
  ): Promise<ChargePeriods> => {
    await ensureLoggedIn();
    const first = await readParam(serial, paramId13, 19);
    const v1 = first.values;
    const p1 = safe(v1, 10),
      p2 = safe(v1, 13),
      p3 = safe(v1, 16);
    const hasMore = p1.enabled && p2.enabled && p3.enabled;
    let v2: number[] = [];
    if (hasMore) {
      await readDelay();
      v2 = (await readParam(serial, paramId46, 9)).values;
    }
    return {
      powerRate: v1[0],
      stopSOC: v1[1],
      raw: `[1-3]: ${first.msg}`,
      period1: p1,
      period2: p2,
      period3: p3,
      period4: safe(v2, 0),
      period5: safe(v2, 3),
      period6: safe(v2, 6),
    };
  };

  // How full the battery is now, in percent. It's Growatt's copy, updated
  // about every 5 minutes, so it doesn't use the inverter queue. The status
  // needs the plant the inverter is in, so each of the account's plants is
  // tried until one knows the serial.
  const fetchBatterySoc = async (serial: string) => {
    await ensureLoggedIn();
    const plants = (await request("/index/getPlantListTitle", {})) as unknown;
    const ids = Array.isArray(plants)
      ? plants
          .map((p: unknown) =>
            typeof p === "object" && p !== null && "id" in p
              ? String(p.id)
              : "",
          )
          .filter((id) => /^\d+$/.test(id))
      : [];
    for (const id of ids) {
      const status = (await request(
        `/panel/mix/getMIXStatusData?plantId=${id}`,
        {
          mixSn: serial,
        },
      )) as GrowattResponse & { obj?: { SOC?: unknown; lost?: unknown } };
      if (status.result !== 1 || !status.obj) continue;
      if (String(status.obj.lost).toLowerCase().includes("lost"))
        throw new Error(
          "Your inverter is offline in Growatt, so its battery level isn't up to date",
        );
      const soc = Number(status.obj.SOC);
      if (!Number.isInteger(soc) || soc < 0 || soc > 100) break;
      return soc;
    }
    throw new Error("Growatt didn't give your battery level, try again");
  };

  return {
    // Throws if Growatt rejects the username or password.
    login: () => enqueue(ensureLoggedIn),

    fetchBatterySoc,

    fetchChargePeriods: (serial: string): Promise<ChargePeriods> =>
      enqueue(() =>
        readPeriods(
          serial,
          "mix_ac_charge_time_multi",
          "mix_ac_charge_time_multi_1",
        ),
      ),

    fetchDischargePeriods: (serial: string): Promise<DischargePeriods> =>
      enqueue(() =>
        readPeriods(
          serial,
          "MIX_AC_DISCHARGE_TIME_MULTI",
          "mix_ac_discharge_time_multi_1",
        ),
      ),

    setChargePeriods: (
      serial: string,
      powerRate: string,
      stopSOC: string,
      p1: SlotParam,
      p2: SlotParam = null,
      p3: SlotParam = null,
      p4: SlotParam = null,
      p5: SlotParam = null,
      p6: SlotParam = null,
    ) =>
      enqueue(async () => {
        await ensureLoggedIn();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_charge_time_period",
          param1: powerRate,
          param2: stopSOC,
          param3: "1",
          param4: p1?.startHour ?? "00",
          param5: p1?.startMin ?? "00",
          param6: p1?.endHour ?? "00",
          param7: p1?.endMin ?? "00",
          param8: p1 ? "1" : "0",
          param9: p2?.startHour ?? "00",
          param10: p2?.startMin ?? "00",
          param11: p2?.endHour ?? "00",
          param12: p2?.endMin ?? "00",
          param13: p2 ? "1" : "0",
          param14: p3?.startHour ?? "00",
          param15: p3?.startMin ?? "00",
          param16: p3?.endHour ?? "00",
          param17: p3?.endMin ?? "00",
          param18: p3 ? "1" : "0",
        });
        // Always, even with nothing in slots 4–6, to turn off what's there.
        await writeDelay();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_charge_time_multi_1",
          ...slotParams46(p4, p5, p6),
        });
      }),

    setDischargePeriods: (
      serial: string,
      powerRate: string,
      stopSOC: string,
      p1: SlotParam,
      p2: SlotParam = null,
      p3: SlotParam = null,
      p4: SlotParam = null,
      p5: SlotParam = null,
      p6: SlotParam = null,
    ) =>
      enqueue(async () => {
        await ensureLoggedIn();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_discharge_time_period",
          param1: powerRate,
          param2: stopSOC,
          param3: p1?.startHour ?? "00",
          param4: p1?.startMin ?? "00",
          param5: p1?.endHour ?? "00",
          param6: p1?.endMin ?? "00",
          param7: p1 ? "1" : "0",
          param8: p2?.startHour ?? "00",
          param9: p2?.startMin ?? "00",
          param10: p2?.endHour ?? "00",
          param11: p2?.endMin ?? "00",
          param12: p2 ? "1" : "0",
          param13: p3?.startHour ?? "00",
          param14: p3?.startMin ?? "00",
          param15: p3?.endHour ?? "00",
          param16: p3?.endMin ?? "00",
          param17: p3 ? "1" : "0",
        });
        // Always, even with nothing in slots 4–6, to turn off what's there.
        await writeDelay();
        await request("/tcpSet.do", {
          action: "mixSet",
          serialNum: serial,
          type: "mix_ac_discharge_time_multi_1",
          ...slotParams46(p4, p5, p6),
        });
      }),
  };
};

export { createGrowattClient };
