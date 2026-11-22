import { useEffect, useState } from "react";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import NotReadYet from "../../components/NotReadYet";
import SectionHeading from "./SectionHeading";
import HistoryControls from "./HistoryControls";
import useToast from "../../contexts/useToast";
import useSavingSessions, { useJoinSession } from "./useSavingSessions";
import useExportPresets from "../growatt/useExportPresets";
import {
  joinedInLastDays,
  sessionStatus,
  sessionsToday,
} from "../../lib/savingSessions";
import type {
  HistoryDays,
  PowerDownSession,
  PowerDownSessionsProps,
} from "../../types/Octopus";

const ukTime = (d: Date) =>
  d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
const ukDay = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/London",
  });

// Octopus takes a few days to award points, so this is only shown in History.
const points = (s: PowerDownSession) =>
  s.pointsAwarded !== null ? `${String(s.pointsAwarded)} pts` : "pending";

const smallButton =
  "px-2.5 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

const PowerDownSessions = ({
  onExportDuringSession,
  exportDisabled,
}: PowerDownSessionsProps) => {
  const { showToast } = useToast();
  const query = useSavingSessions();
  const join = useJoinSession();
  const { high } = useExportPresets();
  const [historyDays, setHistoryDays] = useState<HistoryDays>(7);
  const [showHistory, setShowHistory] = useState(false);
  const now = new Date();

  useEffect(() => {
    if (query.isError)
      showToast(
        `Couldn't load Power Down sessions: ${query.error.message}`,
        "error",
      );
  }, [query.isError, query.error, query.errorUpdatedAt, showToast]);

  // refetch never rejects; errors come through query.error.
  const load = () => {
    void query.refetch({ cancelRefetch: false });
  };

  const handleJoin = (session: PowerDownSession) => {
    if (!session.code) return;
    const timeRange = `${ukTime(session.startAt)}–${ukTime(session.endAt)}`;
    if (!window.confirm(`Join the ${timeRange} Power Down session?`)) return;
    join.mutate(session.code, {
      onSuccess: () => {
        showToast(`Joined the ${timeRange} Power Down session`, "success");
        load();
      },
      onError: (error) => {
        showToast(
          `Couldn't join the ${timeRange} session: ${error.message}`,
          "error",
        );
      },
    });
  };

  const data = query.data;
  const today = data ? sessionsToday(data, now) : [];
  const history = data ? joinedInLastDays(data, historyDays, now) : [];
  const withPoints = history.filter((s) => s.pointsAwarded !== null);
  // Faded and locked while loading or joining, like the inverter cards.
  const isDisabled = query.isFetching || join.isPending;

  return (
    <div
      className={`rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6 transition-opacity ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-strong">
            Power Down Sessions
          </h2>
          <InfoTip label="Power Down Sessions">
            <p>
              Octopus pays you points for using less grid power during these
              sessions.
            </p>
            <ul>
              <li>
                <b>Load</b> gets today&apos;s sessions from Octopus.
              </li>
              <li>
                <b>Join</b> signs you up. You must join before the session
                starts.
              </li>
              <li>
                <b>Export during session</b> adds the session&apos;s times to
                Export to grid, using your &ldquo;{high.name}&rdquo;
                preset&apos;s power and stop level. Check it and press Apply
                export times.
              </li>
              <li>
                <b>History</b> shows the sessions you joined and your points.
                Points can take a few days to appear.
              </li>
            </ul>
          </InfoTip>
          {query.isFetching && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Spinner />
              Loading…
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={isDisabled}
          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Load
        </button>
      </div>

      {!data ? (
        <NotReadYet
          isReading={query.isFetching}
          loadingMessage="Loading sessions from Octopus…"
          emptyMessage="Sessions not loaded yet"
          hint="Press Load to get your Power Down sessions from Octopus."
        />
      ) : (
        <>
          {/* Today: every session in your region, with the actions */}
          <div className="mb-3">
            <SectionHeading>Today</SectionHeading>
          </div>
          {today.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">
              No Power Down sessions today.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {today.map((s) => {
                const status = sessionStatus(s, now);
                const canExport = s.joined && status !== "ended";
                const canJoin = !s.joined && status === "upcoming" && !!s.code;
                const isJoining = join.isPending && join.variables === s.code;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-100">
                        {ukTime(s.startAt)}–{ukTime(s.endAt)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.rewardPerKwh !== null
                          ? `${String(s.rewardPerKwh)} pts/kWh`
                          : "rate unknown"}{" "}
                        · {status}
                      </p>
                    </div>
                    <span
                      className={`flex-1 text-center text-xs font-medium ${s.joined ? "text-emerald-400" : "text-gray-500"}`}
                    >
                      {s.joined ? "Joined" : "Not joined"}
                    </span>
                    <div className="flex-1 flex justify-end">
                      {canJoin && (
                        <button
                          onClick={() => {
                            handleJoin(s);
                          }}
                          disabled={join.isPending || query.isFetching}
                          className={`${smallButton} bg-blue-600 hover:bg-blue-500 disabled:hover:bg-blue-600`}
                        >
                          {isJoining ? "Joining…" : "Join"}
                        </button>
                      )}
                      {canExport && (
                        <button
                          onClick={() => {
                            onExportDuringSession(s);
                          }}
                          disabled={exportDisabled}
                          className={`${smallButton} bg-emerald-600 hover:bg-emerald-500 disabled:hover:bg-emerald-600`}
                        >
                          Export during session
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History: sessions you joined, with points */}
          <div className="mt-6 pt-5 border-t border-gray-800">
            <HistoryControls
              label="Show Power Down history"
              showHistory={showHistory}
              onToggle={() => {
                setShowHistory((v) => !v);
              }}
              days={historyDays}
              onDaysChange={setHistoryDays}
            />

            {showHistory && (
              <>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-3">
                    No joined sessions in the last {historyDays} days.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-3">
                      {history.length} joined ·{" "}
                      {withPoints.reduce(
                        (sum, s) => sum + (s.pointsAwarded ?? 0),
                        0,
                      )}{" "}
                      points ·{" "}
                      {withPoints.filter((s) => s.pointsAwarded === 0).length}{" "}
                      earned 0 · {history.length - withPoints.length} pending
                    </p>
                    <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                      {history.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-gray-100">
                              <span className="text-gray-400">
                                {ukDay(s.startAt)} ·{" "}
                              </span>
                              {ukTime(s.startAt)}–{ukTime(s.endAt)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {s.rewardPerKwh !== null
                                ? `${String(s.rewardPerKwh)} pts/kWh`
                                : "rate unknown"}
                            </p>
                          </div>
                          <span className="text-xs text-gray-300 shrink-0">
                            {points(s)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PowerDownSessions;
