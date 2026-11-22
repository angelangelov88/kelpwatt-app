import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import useAuth from "../auth/useAuth";
import HappyHoursForm from "./HappyHoursForm";
import useSettings from "./useSettings";

// Happy hours: charge during booked Octopus happy hours, and export before
// them so they fill the battery back up. Run by automatic charging's check,
// so it needs that on, with Growatt and Octopus. The export also needs the
// battery details.
const HappyHoursCard = () => {
  const { me } = useAuth();
  const settings = useSettings();

  const renderBody = () => {
    if (!(me?.hasGrowatt ?? false) || !(me?.hasOctopus ?? false))
      return (
        <p className="text-sm text-gray-400">
          Add your Growatt and Octopus details below to use this.
        </p>
      );
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    if (!settings.data.automationEnabled)
      return (
        <p className="text-sm text-gray-400">
          Turn on automatic charging above to use this.
        </p>
      );
    return (
      <HappyHoursForm
        saved={settings.data}
        hasBattery={
          settings.data.batteryKwh !== null &&
          settings.data.maxDischargeKw !== null
        }
      />
    );
  };

  return (
    <section
      aria-labelledby="happy-hours-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="happy-hours-heading"
          className="text-base font-semibold text-strong"
        >
          Happy hours
        </h2>
        <InfoTip label="Happy hours">
          <p>
            For the happy hours you book on the Octopus page. Charging adds each
            one to your inverter&apos;s charge times shortly before it starts,
            at its own charge rate and level.
          </p>
          <p>
            Exporting before works out how much a happy hour can charge back:
            your charge rate times your battery&apos;s maximum discharge speed,
            for the whole happy hour, counting only 90% of it since charging
            slows near full. It exports down to that, never below your level,
            and finishes the minute the happy hour starts. Happy hours back to
            back count as one. If the happy hour is cancelled or moved while
            it&apos;s exporting, the export stops at the next check. If only
            part of it is (one of two back to back), its level goes up to match.
          </p>
          <p>Every run and skip shows in Activity.</p>
        </InfoTip>
      </div>
      {renderBody()}
    </section>
  );
};

export default HappyHoursCard;
