import { useMutation, useQueryClient } from "@tanstack/react-query";
import FormAlert from "../../components/FormAlert";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import type { AutomaticExport, Settings } from "../../types/Api";
import type { AutomaticExportSwitchProps } from "../../types/Settings";
import { SETTINGS_KEY } from "./useSettings";

// Turns Automatic export on or off straight away, keeping the saved time and
// levels.
const AutomaticExportSwitch = ({ saved }: AutomaticExportSwitchProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isOn = saved.automaticExport.enabled;

  const toggle = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest<Settings>("settings?part=automatic", {
        method: "PUT",
        body: { ...saved.automaticExport, enabled } satisfies AutomaticExport,
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      showToast(
        settings.automaticExport.enabled
          ? "Automatic export turned on"
          : "Automatic export turned off",
        "success",
      );
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span id="automatic-export-label" className="text-sm text-gray-200">
            Export every evening
          </span>
          <span id="automatic-export-hint" className="text-sm text-gray-400">
            It won&apos;t run while your car is plugged in. We see it as plugged
            in when Intelligent Octopus has charging planned.
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby="automatic-export-label"
          aria-describedby="automatic-export-hint"
          disabled={toggle.isPending}
          onClick={() => {
            toggle.mutate(!isOn);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:opacity-40 disabled:cursor-not-allowed ${
            isOn ? "bg-violet-600" : "bg-gray-700"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              isOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {toggle.error && <FormAlert message={toggle.error.message} />}
    </div>
  );
};

export default AutomaticExportSwitch;
