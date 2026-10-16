import FormAlert from "../../components/FormAlert";
import InfoTip from "../../components/InfoTip";
import Spinner from "../../components/Spinner";
import { isAppleMobile, isPhoneBrowserTab } from "../../lib/pushDevice";
import NotificationKinds from "./NotificationKinds";
import NotificationsSwitch from "./NotificationsSwitch";
import useNotifications from "./useNotifications";
import useSettings from "./useSettings";

// Push notifications for some activity: turned on per device, with the kinds
// to send saved to the account.
const NotificationsCard = () => {
  const settings = useSettings();
  const { state, toggle } = useNotifications();

  const renderDevice = () => {
    if (state === "unsupported")
      return (
        <p className="text-sm text-gray-400">
          {isAppleMobile()
            ? "On iPhone or iPad, add Kelpwatt to your Home Screen first (Share, then Add to Home Screen), and turn notifications on in the app."
            : "This browser can't show notifications. Try Chrome, Edge or Firefox."}
        </p>
      );
    if (state === "blocked")
      return (
        <p className="text-sm text-gray-400">
          Notifications are blocked for this site. Allow them in your
          browser&apos;s site settings, then come back here.
        </p>
      );
    return (
      <div className="flex flex-col gap-3">
        <NotificationsSwitch
          state={state}
          isPending={toggle.isPending}
          onChange={(on) => {
            toggle.mutate(on);
          }}
        />
        {toggle.error && <FormAlert message={toggle.error.message} />}
        {isPhoneBrowserTab() && (
          <p className="text-xs text-gray-500">
            Tip: install Kelpwatt from your browser&apos;s menu, so
            notifications show with Kelpwatt&apos;s icon.
          </p>
        )}
      </div>
    );
  };

  const renderKinds = () => {
    if (settings.isPending)
      return (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Loading…
        </p>
      );
    if (settings.isError) return <FormAlert message={settings.error.message} />;
    return <NotificationKinds saved={settings.data} />;
  };

  return (
    <section
      aria-labelledby="notifications-heading"
      className="rounded-2xl bg-gray-900 border border-gray-800 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <h2
          id="notifications-heading"
          className="text-base font-semibold text-strong"
        >
          Notifications
        </h2>
        <InfoTip label="Notifications">
          <p>
            We send a notification when something on your Activity page needs
            you, such as automatic charging stopping, or a login. Tapping it
            opens the Activity page.
          </p>
          <p>
            We don&apos;t keep them: if your device is off for more than 12
            hours, the ones it missed are dropped.
          </p>
        </InfoTip>
      </div>
      <div className="flex flex-col gap-6">
        {renderDevice()}
        {renderKinds()}
      </div>
    </section>
  );
};

export default NotificationsCard;
