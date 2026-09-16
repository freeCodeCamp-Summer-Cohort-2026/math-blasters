import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { Homepage } from "./pages/Homepage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LessonView } from "./pages/LessonView";
import FeedbackStyleGuideView from "./pages/FeedbackStyleGuideView";

/**
 * Route declaration for the app.
 */

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Homepage />} />
        <Route path="/lessons/:slug" element={<LessonView />} />
        <Route path="/dev-only-feedback-styleguide" element={import.meta.env.DEV ? <FeedbackStyleGuideView /> : <NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
