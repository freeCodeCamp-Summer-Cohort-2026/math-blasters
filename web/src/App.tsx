import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import type { Account } from "./types";
import { Layout } from "./components/Layout";
import { Homepage } from "./pages/Homepage";
import { LoginPage } from "./pages/LoginPage";
import { ModulePage } from "./pages/ModulePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LessonView } from "./pages/LessonView";
import FeedbackStyleGuideView from "./pages/FeedbackStyleGuideView";
import MarkdownStyleGuideView from "./pages/MarkdownStyleGuideView";

/**
 * Route declaration for the app.
 */

export interface AppRoutesProps {
  initialAccount?: Account | null;
  initialLoading?: boolean;
}

export function AppRoutes({
  initialAccount = null,
  initialLoading = true,
}: AppRoutesProps = {}) {
  return (
    <AuthProvider
      initialAccount={initialAccount}
      initialLoading={initialLoading}
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Homepage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/modules/:slug" element={<ModulePage />} />
          <Route path="/lessons/:slug" element={<LessonView />} />
          <Route
            path="/dev-only-feedback-styleguide"
            element={
              import.meta.env.DEV ? (
                <FeedbackStyleGuideView />
              ) : (
                <NotFoundPage />
              )
            }
          />
          <Route
            path="/dev-only-markdown-styleguide"
            element={
              import.meta.env.DEV ? (
                <MarkdownStyleGuideView />
              ) : (
                <NotFoundPage />
              )
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export type AppProps = AppRoutesProps;

export function App(props: AppProps = {}) {
  return (
    <BrowserRouter>
      <AppRoutes {...props} />
    </BrowserRouter>
  );
}
