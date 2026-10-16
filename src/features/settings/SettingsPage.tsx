import AppearanceCard from "./AppearanceCard";
import AutomaticExportCard from "./AutomaticExportCard";
import AutomationCard from "./AutomationCard";
import BatteryCard from "./BatteryCard";
import ChargeSettingsCard from "./ChargeSettingsCard";
import CredentialsCard from "./CredentialsCard";
import DailyExportCard from "./DailyExportCard";
import DangerZoneCard from "./DangerZoneCard";
import ExportPresetsCard from "./ExportPresetsCard";
import NotificationsCard from "./NotificationsCard";
import PasswordCard from "./PasswordCard";
import SecurityCard from "./SecurityCard";

const SettingsPage = () => (
  <main className="w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
    <h1 className="text-xl font-semibold text-strong">Settings</h1>
    <AutomationCard />
    <ChargeSettingsCard />
    <DailyExportCard />
    <AutomaticExportCard />
    <ExportPresetsCard />
    <BatteryCard />
    <NotificationsCard />
    <AppearanceCard />
    <CredentialsCard />
    <PasswordCard />
    <SecurityCard />
    <DangerZoneCard />
  </main>
);

export default SettingsPage;
