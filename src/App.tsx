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
import HRDPage from './pages/HRDPage';
import HRDHomePage from './pages/HRDHomePage';
import EmployeeOnboardingPage from './pages/EmployeeOnboardingPage';
import OmsPortalPage from './pages/OmsPortalPage';
import AdministratorWorkspacePage from './administrator/pages/AdministratorWorkspacePage';
import AffiliatePage from './affiliate/pages/AffiliatePage';
import CommunityPage from './community/pages/CommunityPage';
import CustomerPage from './customer/pages/CustomerPage';
import InfluencerPage from './influencer/pages/InfluencerPage';
import SupplierPage from './supplier/pages/SupplierPage';

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
          <Route path="/onboarding/*" element={<ProtectedRoute menuKey="ONBOARDING"><EmployeeOnboardingPage /></ProtectedRoute>} />
          <Route path="/hrd" element={<ProtectedRoute menuKey="HRD"><HRDHomePage /></ProtectedRoute>} />
          <Route path="/karyawan" element={<ProtectedRoute menuKey="HRD"><HRDPage /></ProtectedRoute>} />
          <Route path="/hrd/employee" element={<ProtectedRoute menuKey="HRD"><HRDPage /></ProtectedRoute>} />
          <Route path="/supplier/*" element={<ProtectedRoute><SupplierPage /></ProtectedRoute>} />
          <Route path="/customer/*" element={<ProtectedRoute><CustomerPage /></ProtectedRoute>} />
          <Route path="/affiliate/*" element={<ProtectedRoute><AffiliatePage /></ProtectedRoute>} />
          <Route path="/influencer/*" element={<ProtectedRoute><InfluencerPage /></ProtectedRoute>} />
          <Route path="/community/*" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/portal-administrator/*" element={<ProtectedRoute adminOnly><AdministratorWorkspacePage /></ProtectedRoute>} />
          <Route path="/me" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/administrator" element={<ProtectedRoute adminOnly><AdministratorPage /></ProtectedRoute>} />
          <Route path="/administrator/users" element={<ProtectedRoute adminOnly><UserListPage /></ProtectedRoute>} />
          <Route path="/administrator/jabatan" element={<ProtectedRoute adminOnly><JabatanListPage /></ProtectedRoute>} />
          <Route path="/administrator/access-role" element={<ProtectedRoute adminOnly><AccessRolePage /></ProtectedRoute>} />
          <Route path="/administrator/audit-log" element={<ProtectedRoute adminOnly><AuditLogPage /></ProtectedRoute>} />
          <Route path="/administrator/notification-template" element={<ProtectedRoute adminOnly><NotificationTemplatePage /></ProtectedRoute>} />
          <Route path="/fishbone" element={<ProtectedRoute menuKey="FISHBONE"><FishbonePage /></ProtectedRoute>} />
          <Route path="/:portalSlug/*" element={<ProtectedRoute><OmsPortalPage /></ProtectedRoute>} />
          <Route path="/*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
