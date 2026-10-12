import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import useAuth from "../auth/useAuth";
import ChargeSettingsForm from "./ChargeSettingsForm";
import useSettings from "./useSettings";

// How the inverter charges from the grid. Used by the Charge battery card's
// Apply my settings (Growatt), and by automatic charging and the green button
// on the dashboard's Octopus card (Octopus), so with either.
const ChargeSettingsCard = () => {
  const { me } = useAuth();
  const settings = useSettings();
  const hasOctopus = me?.hasOctopus ?? false;

  const renderBody = () => {
    if (!(me?.hasGrowatt ?? false) && !hasOctopus)
      return (
        <p className="text-sm text-gray-400">
          Add your Growatt or Octopus details below to use these.
        </p>
      );
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return <ChargeSettingsForm saved={settings.data} hasOctopus={hasOctopus} />;
  };

  return (
    <section
      aria-labelledby="charge-settings-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="charge-settings-heading"
          className="text-base font-semibold text-strong"
        >
          Battery charging settings
        </h2>
        <InfoTip label="Battery charging settings">
          <p>
            How the inverter charges your battery from the grid. Used by{" "}
            <b>Apply my settings</b> on the dashboard&apos;s Charge battery card
            {hasOctopus &&
              ", automatic charging and the green button on the Octopus card"}
            .
          </p>
        </InfoTip>
      </div>
      {renderBody()}
    </section>
  );
};

export default ChargeSettingsCard;
