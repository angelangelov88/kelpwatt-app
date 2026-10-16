import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import useToast from "../../contexts/useToast";
import {
  readDeviceState,
  subscribeDevice,
  unsubscribeDevice,
} from "../../lib/pushDevice";

const DEVICE_KEY = ["push-device"];

// Whether this device gets notifications, and the switch that changes it.
const useNotifications = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const device = useQuery({
    queryKey: DEVICE_KEY,
    queryFn: readDeviceState,
  });

  const toggle = useMutation({
    mutationFn: async (on: boolean) => {
      await (on ? subscribeDevice() : unsubscribeDevice());
      return on;
    },
    onSuccess: (on) => {
      queryClient.setQueryData(DEVICE_KEY, on ? "on" : "off");
      showToast(
        on
          ? "Notifications turned on for this device"
          : "Notifications turned off for this device",
        "success",
      );
    },
    // The browser's permission may have changed, e.g. to blocked.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: DEVICE_KEY });
    },
  });

  return {
    state: device.data ?? "loading",
    toggle,
  };
};

export default useNotifications;
