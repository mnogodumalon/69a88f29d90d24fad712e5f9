import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SchadenskategorienPage from '@/pages/SchadenskategorienPage';
import StrassenschadenmeldungenPage from '@/pages/StrassenschadenmeldungenPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="schadenskategorien" element={<SchadenskategorienPage />} />
          <Route path="straßenschadenmeldungen" element={<StrassenschadenmeldungenPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}