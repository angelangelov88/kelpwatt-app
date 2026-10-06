import type { ActivityItemProps } from "../../types/Activity";
import { timeOf } from "./activityDays";
import describeActivity from "./describeActivity";

// One activity log entry: when, what, and where it came from.
const ActivityItem = ({ entry }: ActivityItemProps) => {
  const { title, detail, failed } = describeActivity(entry);
  return (
    // data-id: the audit_log id, for support. Not shown, as it means nothing to
    // the user and the gaps between ids hint at other users' activity.
    <li data-id={entry.id} className="flex gap-4 py-3">
      <time
        dateTime={entry.at}
        className="w-12 shrink-0 text-sm tabular-nums text-gray-500"
      >
        {timeOf(entry.at)}
      </time>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p
          className={`text-sm font-medium ${failed ? "text-red-400" : "text-gray-100"}`}
        >
          {title}
        </p>
        {detail && <p className="text-sm text-gray-400">{detail}</p>}
        <p className="text-xs text-gray-500">
          {entry.ip ? `IP ${entry.ip}` : "Automatic"}
        </p>
      </div>
    </li>
  );
};

export default ActivityItem;
