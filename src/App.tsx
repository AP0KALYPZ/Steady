import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { OverviewPage } from "./pages/OverviewPage";
import { DailyJournalPage } from "./pages/DailyJournalPage";
import { WeightProgressPage } from "./pages/WeightProgressPage";
import { MealRoutinePage } from "./pages/MealRoutinePage";
import { InsightsPage } from "./pages/InsightsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/journal" element={<DailyJournalPage />} />
        <Route path="/progress" element={<WeightProgressPage />} />
        <Route path="/meals" element={<MealRoutinePage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Route>
    </Routes>
  );
}
