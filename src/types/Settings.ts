import type {
  ExportPreset,
  MfaEnrollment,
  Preset,
  Provider,
  Settings,
} from "./Api";
import type { FieldErrors } from "./Common";

type MfaSetupProps = {
  enrollment: MfaEnrollment;
  onDone: () => void;
  onCancel: () => void;
};

type MfaTurnOffProps = { onDone: () => void; onCancel: () => void };

// onDone gets the message to show.
type PasswordFormProps = {
  onDone: (message: string) => void;
  onCancel: () => void;
};

// onDone gets the message to show.
type CredentialsFormProps = {
  provider: Provider;
  onDone: (message: string) => void;
  onCancel: () => void;
};

// saved is the non-secret part (serial or account number), or null.
type CredentialsRowProps = {
  provider: Provider;
  saved: { identifier: string; verifiedAt: string } | null;
  isEditing: boolean;
  onEdit: () => void;
  onDone: (message: string) => void;
  onCancel: () => void;
};

// The saved settings the form starts from.
type ChargeSettingsFormProps = { saved: Settings };

type AutomationSwitchProps = { saved: Settings; canTurnOn: boolean };

type DeleteAccountFormProps = { onCancel: () => void };

// One preset as typed in the form: the dropdowns give strings.
type ExportPresetDraft = Omit<ExportPreset, "powerRate" | "stopSOC"> & {
  powerRate: string;
  stopSOC: string;
};

type ExportPresetDrafts = Record<Preset, ExportPresetDraft>;

type ExportPresetsFormProps = { saved: Settings };

// errors are keyed by field, e.g. "name".
type ExportPresetFieldsProps = {
  preset: Preset;
  value: ExportPresetDraft;
  errors: FieldErrors;
  disabled: boolean;
  onChange: (field: keyof ExportPresetDraft, value: string) => void;
  // Puts this preset back to its default values; greyed out when it already is.
  onReset: () => void;
  isDefault: boolean;
};

type DailyExportSwitchProps = { saved: Settings };

type AutomaticExportSwitchProps = { saved: Settings };

type AutomaticExportFormProps = { saved: Settings };

// The battery fields as typed: text, so a half-typed "5." stays as it is.
type BatteryDraft = { batteryKwh: string; maxDischargeKw: string };

type BatteryFormProps = { saved: Settings };

export type {
  MfaSetupProps,
  MfaTurnOffProps,
  PasswordFormProps,
  CredentialsFormProps,
  CredentialsRowProps,
  ChargeSettingsFormProps,
  AutomationSwitchProps,
  DeleteAccountFormProps,
  ExportPresetDraft,
  ExportPresetDrafts,
  ExportPresetsFormProps,
  ExportPresetFieldsProps,
  DailyExportSwitchProps,
  AutomaticExportSwitchProps,
  AutomaticExportFormProps,
  BatteryDraft,
  BatteryFormProps,
};
