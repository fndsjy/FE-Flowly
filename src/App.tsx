// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OrganisasiPage from './pages/OrganisasiPage';
import IkatanKerjaPage from './pages/IkatanKerjaPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OrgChartPage from './pages/OrgChartPage';

// 🔹 Import ToastProvider
import { ToastProvider } from './components/organisms/MessageToast';
import AdministratorPage from './pages/AdministratorPage';
import ProtectedAdminRoute from './ProtectedAdminRoute';

const App = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/organisasi" element={<OrganisasiPage />} />
          <Route path="/organisasi/:structureId" element={<OrgChartPage />} />
          <Route path="/ikatan-kerja" element={<IkatanKerjaPage />} />
          <Route path="/administrator" element={<ProtectedAdminRoute><AdministratorPage /></ProtectedAdminRoute>} />
          <Route path="/*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;