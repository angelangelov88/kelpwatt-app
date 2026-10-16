import { useMutation, useQueryClient } from "@tanstack/react-query";
import useToast from "../../contexts/useToast";
import { apiRequest } from "../../lib/apiClient";
import { unsubscribeDevice } from "../../lib/pushDevice";
import { ME_KEY, clearSessionData } from "./useAuth";

// Turns off notifications on this device, so a shared browser doesn't get the
// last user's, then ends the session on the server (the cookies are httpOnly,
// so only the server can clear them) and forgets everything cached. The routes
// then show the login page.
const useLogout = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: async () => {
      await unsubscribeDevice();
      await apiRequest("auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      clearSessionData(queryClient);
      queryClient.setQueryData(ME_KEY, null);
    },
    onError: (error) => {
      showToast(`Couldn't log out: ${error.message}`, "error");
    },
  });
};

export default useLogout;
