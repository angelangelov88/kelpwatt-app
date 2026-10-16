import "./lib/zodConfig";
import ReactDOM from "react-dom/client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import ThemeProvider from "./contexts/ThemeProvider";
import ToastProvider from "./contexts/ToastProvider";
import { ME_KEY } from "./features/auth/useAuth";
import { ApiRequestError } from "./lib/apiClient";
import { registerServiceWorker } from "./lib/pushDevice";

// Any request can find the session gone (401) or, for a user with MFA, not yet
// past the code (mfa_required). Either way, update who is logged in, and the
// routes show the login or code page.
const handleApiError = (error: Error) => {
  if (!(error instanceof ApiRequestError)) return;
  if (error.status === 401) queryClient.setQueryData(ME_KEY, null);
  else if (error.code === "mfa_required")
    void queryClient.invalidateQueries({ queryKey: ME_KEY });
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleApiError }),
  mutationCache: new MutationCache({ onError: handleApiError }),
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// For push notifications (public/sw.js).
registerServiceWorker();

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}
