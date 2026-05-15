import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { CreateTestPage } from './pages/CreateTestPage';
import { LiveRunnerPage } from './pages/LiveRunnerPage';
import { TestReportPage } from './pages/TestReportPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/tests/new" element={<CreateTestPage />} />
        <Route path="/runs/:runId/live" element={<LiveRunnerPage />} />
        <Route path="/runs/:runId/report" element={<TestReportPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
