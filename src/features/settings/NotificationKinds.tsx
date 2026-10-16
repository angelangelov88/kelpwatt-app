import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import { apiRequest } from "../../lib/apiClient";
import type { NotificationPrefs, Settings } from "../../types/Api";
import type {
  NotificationKind,
  NotificationKindsProps,
} from "../../types/Notifications";
import { SETTINGS_KEY } from "./useSettings";

const KINDS: NotificationKind[] = [
  {
    key: "failures",
    label: "Problems",
    hint: "Automatic charging stopped or started working again, Automatic export didn't run, or export times couldn't be turned off or put back.",
  },
  {
    key: "summary",
    label: "Morning charging summary",
    hint: "Last night's charging and your battery level, after 07:00. Only with automatic charging on.",
  },
  {
    key: "automaticExport",
    label: "Automatic export",
    hint: "Whether tonight's export started, or why it was skipped.",
  },
  {
    key: "exports",
    label: "Exports finished",
    hint: "When an Export until battery % ends.",
  },
  {
    key: "security",
    label: "Security",
    hint: "Logins, password and two-step verification changes, saved Growatt or Octopus details, and data downloads.",
  },
];

// Which kinds of notification to send. Saved straight away, for every device
// with notifications on.
const NotificationKinds = ({ saved }: NotificationKindsProps) => {
  const queryClient = useQueryClient();
  const prefs = saved.notifications;

  const save = useMutation({
    mutationFn: (body: NotificationPrefs) =>
      apiRequest<Settings>("settings?part=notifications", {
        method: "PUT",
        body,
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
    },
  });

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm text-gray-200 mb-3">Notify me about</legend>
      {save.error && <FormAlert message={save.error.message} />}
      {KINDS.map(({ key, label, hint }) => (
        <div key={key} className="flex items-start gap-3">
          <input
            id={`notify-${key}`}
            type="checkbox"
            checked={prefs[key]}
            onChange={(e) => {
              save.mutate({ ...prefs, [key]: e.target.checked });
            }}
            disabled={save.isPending}
            aria-describedby={`notify-${key}-hint`}
            className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={`notify-${key}`} className="text-sm text-gray-200">
              {label}
            </label>
            <span id={`notify-${key}-hint`} className="text-xs text-gray-500">
              {hint}
            </span>
          </div>
        </div>
      ))}
    </fieldset>
  );
};

export default NotificationKinds;
