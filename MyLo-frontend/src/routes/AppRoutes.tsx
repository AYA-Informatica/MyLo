import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/Auth/LoginPage';
import RegisterPage from '../pages/Auth/RegisterPage';
import ForgetPasswordPage from '../pages/Auth/ForgetPasswordPage';
import VerificationPage from '../pages/Auth/verificationPage';
import Verification from '../pages/VerificationPage'
import NewPasswordPage from '../pages/Auth/NewPasswordPage';
import Feed from '../pages/Feed';
import Userprofile from '../pages/Userprofile';
import FirmPage from '../pages/FirmPage';
import FirmProfilePage from '../pages/FirmProfilePage';
import CommunityPage from '../pages/CommunityPage';
import AIPage from '../pages/AIPage';
import LawPage from '../pages/LawPage';
import Dashboard from '../pages/Dashboard';
import LandingPage from '../pages/LandingPage';
import UsersPage from '../pages/UsersPage';
import ProtectedRoute from '../components/ProtectedRoute';
import ContentPage from '../pages/ContentPage';
import DashLawPage from '../pages/DashLawPage';
import ChatHistoryPage from '../pages/ChatHistoryPage';


export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['law-firm']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forget-password" element={<ForgetPasswordPage />} />
      <Route path="/auth-verification" element={<VerificationPage />} />
      <Route path="/new-password" element={<NewPasswordPage />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute allowedRoles={['citizen', 'law-firm', 'organization']}>
            <Feed />
          </ProtectedRoute>
        }
      />
      <Route path="/user" element={<Userprofile />} />
      <Route path="/firms" element={<FirmPage />} />
      <Route path="/firms/:firmName" element={<FirmProfilePage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/ai" element={<AIPage />} />
      <Route path="/law" element={<LawPage />} />
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['law-firm']}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification"
        element={
          <ProtectedRoute allowedRoles={['law-firm']}>
            <Verification />
          </ProtectedRoute>
        }
      />
      <Route
        path="/content"
        element={
          <ProtectedRoute allowedRoles={['law-firm']}>
            <ContentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashlaw"
        element={
          <ProtectedRoute allowedRoles={['law-firm']}>
            <DashLawPage />
          </ProtectedRoute>
        }
      />
      <Route path="/chat-history" element={<ChatHistoryPage />} />
    </Routes>
  );
}
