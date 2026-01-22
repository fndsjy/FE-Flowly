// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProsedurPage from './pages/ProsedurPage';
import A3Page from './pages/A3Page';
import AbsensiPage from './pages/AbsensiPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChartPage from './pages/ChartPage';

// 🔹 Import ToastProvider
import { ToastProvider } from './components/organisms/MessageToast';
import AdministratorPage from './pages/AdministratorPage';
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AuditLogPage from './pages/AuditLogPage';
import UserListPage from './pages/UserListPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import PilarPage from './pages/PilarPage';
import SBUPage from './pages/SBUPage';
import SBUSUBPage from './pages/SBUSUBPage';
import JabatanListPage from './pages/JabatanListPage';
import AccessRolePage from './pages/AccessRolePage';

const App = () => {
  return (
    <ToastProvider>
      <BrowserRouter basename='/oms/'>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pilar" element={<PilarPage />} />
          <Route path="/pilar/sbu/:pilarId" element={<SBUPage />} />
          <Route path="/pilar/sbu/sbu_sub/:sbuId" element={<SBUSUBPage />} />
          <Route path="/pilar/sbu/sbu_sub/organisasi/:sbuSubId" element={<ChartPage />} />
          <Route path="/prosedur" element={<ProsedurPage />} />
          <Route path="/a3" element={<A3Page />} />
          <Route path="/absensi" element={<AbsensiPage />} />
          <Route path="/me" element={<ChangePasswordPage />} />
          <Route path="/administrator" element={<ProtectedAdminRoute><AdministratorPage /></ProtectedAdminRoute>} />
          <Route path="/administrator/users" element={<ProtectedAdminRoute><UserListPage /></ProtectedAdminRoute>} />
          <Route path="/administrator/jabatan" element={<ProtectedAdminRoute><JabatanListPage /></ProtectedAdminRoute>} />
          <Route path="/administrator/access-role" element={<ProtectedAdminRoute><AccessRolePage /></ProtectedAdminRoute>} />
          <Route path="/administrator/audit-log" element={<ProtectedAdminRoute><AuditLogPage /></ProtectedAdminRoute>} />
          <Route path="/*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
