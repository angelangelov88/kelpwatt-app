import { Navigate, RouterProvider, createBrowserRouter } from "react-router";
import AppLayout from "./components/AppLayout";
import AboutPage from "./features/about/AboutPage";
import ContactPage from "./features/about/ContactPage";
import ActivityPage from "./features/activity/ActivityPage";
import AuthRoute from "./features/auth/AuthRoute";
import ForgotPasswordPage from "./features/auth/ForgotPasswordPage";
import LoginPage from "./features/auth/LoginPage";
import MfaPage from "./features/auth/MfaPage";
import ResetPasswordPage from "./features/auth/ResetPasswordPage";
import SignUpPage from "./features/auth/SignUpPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import PrivacyPage from "./features/legal/PrivacyPage";
import TermsPage from "./features/legal/TermsPage";
import SettingsPage from "./features/settings/SettingsPage";

const router = createBrowserRouter([
  // Every page shares the header and footer.
  {
    element: <AppLayout />,
    children: [
      {
        element: <AuthRoute allow={["signedOut"]} />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/signup", element: <SignUpPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      {
        element: <AuthRoute allow={["needsMfa"]} />,
        children: [{ path: "/mfa", element: <MfaPage /> }],
      },
      {
        element: <AuthRoute allow={["signedIn"]} />,
        children: [
          { path: "/reset-password", element: <ResetPasswordPage /> },
          { path: "/", element: <DashboardPage /> },
          { path: "/settings", element: <SettingsPage /> },
          { path: "/activity", element: <ActivityPage /> },
        ],
      },
      // Open to everyone, signed in or not.
      { path: "/about", element: <AboutPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/terms", element: <TermsPage /> },
      // Loaded when first opened, so the Markdown renderer and the articles
      // stay out of the main bundle.
      {
        path: "/blog",
        lazy: () =>
          import("./features/blog/BlogListPage").then((m) => ({
            Component: m.default,
          })),
      },
      {
        path: "/blog/:slug",
        lazy: () =>
          import("./features/blog/BlogPostPage").then((m) => ({
            Component: m.default,
          })),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
