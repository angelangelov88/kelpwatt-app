import { useEffect, useState } from "react";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import NotReadYet from "../../components/NotReadYet";
import SectionHeading from "./SectionHeading";
import HistoryControls from "./HistoryControls";
import useToast from "../../contexts/useToast";
import useHappyHours, {
  useBookHappyHour,
  useCancelHappyHour,
} from "./useHappyHours";
import {
  MAX_BOOKINGS_PER_WEEKEND,
  bookedInLastDays,
  canCancel,
  cantBookReason,
  upcomingHappyHours,
  weekendLimitReached,
} from "../../lib/happyHours";
import { sessionStatus } from "../../lib/savingSessions";
import type {
  HappyHour,
  HappyHourBooking,
  HistoryDays,
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

const tokens = (n: number) => `${String(n)} ${n === 1 ? "token" : "tokens"}`;

const kwh = (n: number) => `${n.toFixed(1)} kWh`;
const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

// Octopus sets a booking's results a few days after the happy hour, so until
// then it's pending.
const isPending = (b: HappyHourBooking) =>
  b.energyUsedKwh === null && b.creditPence === null;

const smallButton =
  "px-2.5 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

const HappyHours = () => {
  const { showToast } = useToast();
  const query = useHappyHours();
  const book = useBookHappyHour();
  const cancel = useCancelHappyHour();
  const [historyDays, setHistoryDays] = useState<HistoryDays>(7);
  const [showHistory, setShowHistory] = useState(false);
  const now = new Date();

  useEffect(() => {
    if (query.isError)
      showToast(`Couldn't load happy hours: ${query.error.message}`, "error");
  }, [query.isError, query.error, query.errorUpdatedAt, showToast]);

  // refetch never rejects; errors come through query.error.
  const load = () => {
    void query.refetch({ cancelRefetch: false });
  };

  const handleBook = (happyHour: HappyHour) => {
    const when = `${ukDay(happyHour.startAt)} ${ukTime(happyHour.startAt)}–${ukTime(happyHour.endAt)}`;
    const cost =
      happyHour.tokenCost !== null ? ` for ${tokens(happyHour.tokenCost)}` : "";
    if (!window.confirm(`Book the ${when} happy hour${cost}?`)) return;
    book.mutate(happyHour.code, {
      onSuccess: () => {
        showToast(`Booked the ${when} happy hour`, "success");
        load();
      },
      onError: (error) => {
        showToast(
          `Couldn't book the ${when} happy hour: ${error.message}`,
          "error",
        );
      },
    });
  };

  const handleCancel = (happyHour: HappyHour) => {
    const when = `${ukDay(happyHour.startAt)} ${ukTime(happyHour.startAt)}–${ukTime(happyHour.endAt)}`;
    if (!window.confirm(`Cancel your booking for the ${when} happy hour?`))
      return;
    cancel.mutate(happyHour.code, {
      onSuccess: ({ confirmed, tokenBalance }) => {
        if (confirmed)
          showToast(
            `Cancelled the ${when} happy hour` +
              (tokenBalance !== null
                ? `. You now have ${tokens(tokenBalance)}`
                : ""),
            "success",
          );
        else
          showToast(
            `Octopus accepted the cancellation of the ${when} happy hour, but Kelpwatt couldn't check it. Load again to make sure`,
            "info",
          );
        load();
      },
      onError: (error) => {
        showToast(
          `Couldn't cancel the ${when} happy hour: ${error.message}`,
          "error",
        );
        load();
      },
    });
  };

  const data = query.data;
  const upcoming = data ? upcomingHappyHours(data, now) : [];
  const history = data ? bookedInLastDays(data, historyDays, now) : [];
  const pending = history.filter(isPending).length;
  const usedKwh = history.reduce((sum, b) => sum + (b.energyUsedKwh ?? 0), 0);
  const creditPence = history.reduce((sum, b) => sum + (b.creditPence ?? 0), 0);
  // Octopus only lists recent happy hours, so older bookings have no cost.
  const costOf = (b: HappyHourBooking) =>
    data?.events.find((h) => h.id === b.id)?.tokenCost ?? null;
  // Faded and locked while loading, booking or cancelling, like the Power Down
  // card.
  const isBusy = book.isPending || cancel.isPending;
  const isDisabled = query.isFetching || isBusy;

  return (
    <div
      className={`rounded-2xl bg-gray-900 border border-gray-800 p-4 sm:p-6 transition-opacity ${isDisabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-strong">Happy Hours</h2>
          <InfoTip label="Happy Hours">
            <p>
              Octopus&apos;s weekend happy hours give you free or cheap
              electricity. You book them in advance with tokens.
            </p>
            <ul>
              <li>
                <b>Load</b> gets the upcoming happy hours in your region and
                your tokens from Octopus.
              </li>
              <li>
                <b>Book</b> spends your tokens on one. It only shows when
                there&apos;s a place left and you have enough tokens.
              </li>
              <li>
                <b>Cancel</b> cancels a booking. You can cancel until the happy
                hour starts.
              </li>
              <li>
                Octopus normally lets you book {MAX_BOOKINGS_PER_WEEKEND} happy
                hours a weekend, so Book is turned off once you have.
              </li>
              <li>
                <b>History</b> shows the happy hours you booked, with the
                electricity you used and any credit. Octopus can take a few days
                to add these.
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
          loadingMessage="Loading happy hours from Octopus…"
          emptyMessage="Happy hours not loaded yet"
          hint="Press Load to get the happy hours and your tokens from Octopus."
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <SectionHeading>Upcoming</SectionHeading>
            <p className="text-xs text-gray-400">
              {data.tokenBalance !== null
                ? `You have ${tokens(data.tokenBalance)}`
                : "Token balance unknown"}
            </p>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">
              No upcoming happy hours.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((h) => {
                const reason = cantBookReason(h, data.tokenBalance, now);
                const canBook = !h.booked && reason === null;
                // Shown, but disabled, once the weekend's bookings are used up.
                const atLimit = canBook && weekendLimitReached(h, data);
                const isBooking = book.isPending && book.variables === h.code;
                const isCancelling =
                  cancel.isPending && cancel.variables === h.code;
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-100">
                        <span className="text-gray-400">
                          {ukDay(h.startAt)} ·{" "}
                        </span>
                        {ukTime(h.startAt)}–{ukTime(h.endAt)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.tokenCost !== null
                          ? tokens(h.tokenCost)
                          : "cost unknown"}
                        {h.capacity === "LOW" && " · few places left"} ·{" "}
                        {sessionStatus(h, now)}
                      </p>
                    </div>
                    <span
                      className={`flex-1 text-center text-xs font-medium ${h.booked ? "text-emerald-400" : "text-gray-500"}`}
                    >
                      {h.booked
                        ? "Booked"
                        : atLimit
                          ? `${String(MAX_BOOKINGS_PER_WEEKEND)} booked this weekend`
                          : "Not booked"}
                    </span>
                    <div className="flex-1 flex justify-end">
                      {canBook ? (
                        <button
                          onClick={() => {
                            handleBook(h);
                          }}
                          disabled={atLimit || isBusy || query.isFetching}
                          className={`${smallButton} bg-blue-600 hover:bg-blue-500 disabled:hover:bg-blue-600`}
                        >
                          {isBooking ? "Booking…" : "Book"}
                        </button>
                      ) : canCancel(h, now) ? (
                        <button
                          onClick={() => {
                            handleCancel(h);
                          }}
                          disabled={isBusy || query.isFetching}
                          className={`${smallButton} bg-gray-600 hover:bg-gray-500 disabled:hover:bg-gray-600`}
                        >
                          {isCancelling ? "Cancelling…" : "Cancel"}
                        </button>
                      ) : (
                        reason && (
                          <span className="text-xs text-gray-500 text-right">
                            {reason}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* History: happy hours you booked that have ended */}
          <div className="mt-6 pt-5 border-t border-gray-800">
            <HistoryControls
              label="Show happy hour history"
              showHistory={showHistory}
              onToggle={() => {
                setShowHistory((v) => !v);
              }}
              days={historyDays}
              onDaysChange={setHistoryDays}
            />

            {showHistory &&
              (history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-3">
                  No booked happy hours in the last {historyDays} days.
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-3">
                    {history.length} booked · {kwh(usedKwh)} used
                    {creditPence > 0 &&
                      ` · ${pounds(creditPence)} credit`} · {pending} pending
                  </p>
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {history.map((b) => {
                      const cost = costOf(b);
                      return (
                        <div
                          key={b.id}
                          className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono text-gray-100">
                              <span className="text-gray-400">
                                {ukDay(b.startAt)} ·{" "}
                              </span>
                              {ukTime(b.startAt)}–{ukTime(b.endAt)}
                            </p>
                            {cost !== null && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {tokens(cost)}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-300 shrink-0 text-right">
                            {isPending(b)
                              ? "pending"
                              : [
                                  b.energyUsedKwh !== null &&
                                    `${kwh(b.energyUsedKwh)} used`,
                                  b.creditPence && pounds(b.creditPence),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HappyHours;
