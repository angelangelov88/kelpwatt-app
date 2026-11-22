import { useEffect } from "react";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import NotReadYet from "../../components/NotReadYet";
import SectionHeading from "./SectionHeading";
import useToast from "../../contexts/useToast";
import useHappyHours, { useBookHappyHour } from "./useHappyHours";
import {
  MAX_BOOKINGS_PER_WEEKEND,
  cantBookReason,
  upcomingHappyHours,
  weekendLimitReached,
} from "../../lib/happyHours";
import { sessionStatus } from "../../lib/savingSessions";
import type { HappyHour } from "../../types/Octopus";

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

const smallButton =
  "px-2.5 py-1 rounded-lg text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

const HappyHours = () => {
  const { showToast } = useToast();
  const query = useHappyHours();
  const book = useBookHappyHour();
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

  const data = query.data;
  const upcoming = data ? upcomingHappyHours(data, now) : [];
  // Faded and locked while loading or booking, like the Power Down card.
  const isDisabled = query.isFetching || book.isPending;

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
                Octopus normally lets you book {MAX_BOOKINGS_PER_WEEKEND} happy
                hours a weekend, so Book is turned off once you have.
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
                          disabled={
                            atLimit || book.isPending || query.isFetching
                          }
                          className={`${smallButton} bg-blue-600 hover:bg-blue-500 disabled:hover:bg-blue-600`}
                        >
                          {isBooking ? "Booking…" : "Book"}
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
        </>
      )}
    </div>
  );
};

export default HappyHours;
