import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import useAuth from "../auth/useAuth";
import AutomaticExportForm from "./AutomaticExportForm";
import AutomaticExportSwitch from "./AutomaticExportSwitch";
import useSettings from "./useSettings";

// Automatic export: Export until battery % every evening at a chosen time.
// Needs Growatt (the battery level and the export) and the battery details
// (how long to export for). With Octopus, it also skips while the car is
// plugged in.
const AutomaticExportCard = () => {
  const { me } = useAuth();
  const settings = useSettings();
  const hasOctopus = me?.hasOctopus ?? false;

  const renderBody = () => {
    if (!(me?.hasGrowatt ?? false))
      return (
        <p className="text-sm text-gray-400">
          Add your Growatt details below to use this.
        </p>
      );
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    if (
      settings.data.batteryKwh === null ||
      settings.data.maxDischargeKw === null
    )
      return (
        <p className="text-sm text-gray-400">
          Add your battery details under Your battery below to use this.
        </p>
      );
    return (
      <div className="flex flex-col gap-6">
        <AutomaticExportSwitch saved={settings.data} hasOctopus={hasOctopus} />
        <AutomaticExportForm saved={settings.data} />
      </div>
    );
  };

  return (
    <section
      aria-labelledby="automatic-export-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="automatic-export-heading"
          className="text-base font-semibold text-strong"
        >
          Automatic export
        </h2>
        <InfoTip label="Automatic export">
          <p>
            Does what the dashboard&apos;s <b>Export until battery %</b> does,
            every evening at your time: reads your battery level and exports to
            the grid until it reaches your stop level.
          </p>
          <p>
            It doesn&apos;t run
            {hasOctopus && " while your car is plugged in,"} when the battery is
            below your minimum, or when the export would last less than 5
            minutes. Every run and skip shows in Activity.
          </p>
        </InfoTip>
      </div>
      {renderBody()}
    </section>
  );
};

export default AutomaticExportCard;
