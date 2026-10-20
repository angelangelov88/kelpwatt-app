import { useState } from "react";
import FormAlert from "../../components/FormAlert";
import Spinner from "../../components/Spinner";
import useToast from "../../contexts/useToast";
import type { Provider } from "../../types/Api";
import CredentialsRow from "./CredentialsRow";
import useCredentials from "./useCredentials";

// The user's Growatt login and Octopus API key. One form is open at a time.
const CredentialsCard = () => {
  const { showToast } = useToast();
  const credentials = useCredentials();
  const [editing, setEditing] = useState<Provider | null>(null);

  const handleDone = (message: string) => {
    setEditing(null);
    showToast(message, "success");
  };

  const renderBody = () => {
    if (credentials.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (credentials.isError)
      return <FormAlert message={credentials.error.message} />;
    const { growatt, octopus } = credentials.data;
    const rows = [
      {
        provider: "growatt" as const,
        saved: growatt && {
          identifier: growatt.serial,
          verifiedAt: growatt.verifiedAt,
        },
      },
      {
        provider: "octopus" as const,
        saved: octopus && {
          identifier: octopus.account,
          verifiedAt: octopus.verifiedAt,
        },
      },
    ];
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-gray-400">
          Kelpwatt works with Growatt SPH inverters. Your details are checked
          with Growatt and Octopus, then stored encrypted. They&apos;re never
          shown again, not even to you.
        </p>
        {rows.map(({ provider, saved }) => (
          <CredentialsRow
            key={provider}
            provider={provider}
            saved={saved}
            isEditing={editing === provider}
            onEdit={() => {
              setEditing(provider);
            }}
            onDone={handleDone}
            onCancel={() => {
              setEditing(null);
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <section
      aria-labelledby="credentials-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <h2
        id="credentials-heading"
        className="text-base font-semibold text-strong mb-4"
      >
        Growatt and Octopus
      </h2>
      {renderBody()}
    </section>
  );
};

export default CredentialsCard;
