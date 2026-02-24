// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProsedurPage from './pages/ProsedurPage';
import ProcedureSopPage from './pages/ProcedureSopPage';
import MasterIkPage from './pages/MasterIkPage';
import A3Page from './pages/A3Page';
import AbsensiPage from './pages/AbsensiPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChartPage from './pages/ChartPage';

// 🔹 Import ToastProvider
import { ToastProvider } from './components/organisms/MessageToast';
import AdministratorPage from './pages/AdministratorPage';
import ProtectedRoute from './ProtectedRoute';
import AuditLogPage from './pages/AuditLogPage';
import UserListPage from './pages/UserListPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import PilarPage from './pages/PilarPage';
import SBUPage from './pages/SBUPage';
import SBUSUBPage from './pages/SBUSUBPage';
import JabatanListPage from './pages/JabatanListPage';
import AccessRolePage from './pages/AccessRolePage';
import FishbonePage from './pages/FishbonePage';
import NotificationTemplatePage from './pages/NotificationTemplatePage';

const App = () => {
  return (
    <ToastProvider>
      <BrowserRouter basename='/oms/'>
        <Routes>
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pilar" element={<ProtectedRoute menuKey="ORGANISASI"><PilarPage /></ProtectedRoute>} />
          <Route path="/pilar/sbu/:pilarId" element={<ProtectedRoute menuKey="ORGANISASI"><SBUPage /></ProtectedRoute>} />
          <Route path="/pilar/sbu/sbu_sub/:sbuId" element={<ProtectedRoute menuKey="ORGANISASI"><SBUSUBPage /></ProtectedRoute>} />
          <Route path="/pilar/sbu/sbu_sub/organisasi/:sbuSubId" element={<ProtectedRoute menuKey="ORGANISASI"><ChartPage /></ProtectedRoute>} />
          <Route path="/prosedur" element={<ProtectedRoute menuKey="PROSEDUR"><ProsedurPage /></ProtectedRoute>} />
          <Route path="/prosedur/sop/:sbuSubId" element={<ProtectedRoute menuKey="PROSEDUR"><ProcedureSopPage /></ProtectedRoute>} />
          <Route path="/prosedur/master-ik" element={<ProtectedRoute menuKey="PROSEDUR"><MasterIkPage /></ProtectedRoute>} />
          <Route path="/a3" element={<ProtectedRoute menuKey="A3"><A3Page /></ProtectedRoute>} />
          <Route path="/absensi" element={<ProtectedRoute menuKey="ABSENSI"><AbsensiPage /></ProtectedRoute>} />
          <Route path="/me" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/administrator" element={<ProtectedRoute adminOnly><AdministratorPage /></ProtectedRoute>} />
          <Route path="/administrator/users" element={<ProtectedRoute adminOnly><UserListPage /></ProtectedRoute>} />
          <Route path="/administrator/jabatan" element={<ProtectedRoute adminOnly><JabatanListPage /></ProtectedRoute>} />
          <Route path="/administrator/access-role" element={<ProtectedRoute adminOnly><AccessRolePage /></ProtectedRoute>} />
          <Route path="/administrator/audit-log" element={<ProtectedRoute adminOnly><AuditLogPage /></ProtectedRoute>} />
          <Route path="/administrator/notification-template" element={<ProtectedRoute adminOnly><NotificationTemplatePage /></ProtectedRoute>} />
          <Route path="/fishbone" element={<ProtectedRoute adminOnly><FishbonePage /></ProtectedRoute>} />
          <Route path="/*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
