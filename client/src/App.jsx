import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import SellersPage from './pages/SellersPage';
import SellerLedgerPage from './pages/SellerLedgerPage';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import OrderAnalyticsPage from './pages/OrderAnalyticsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Navbar from './components/Navbar';
import ErrorBoundary from './common/ErrorBoundary';
import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

export default function App() {
  const { user } = useAuth();

  const toaster = (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        },
      }}
    />
  );

  // Unauthenticated routes
  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
        {toaster}
      </>
    );
  }

  return (
    <>
      <Navbar />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/sellers" element={<SellersPage />} />
          <Route path="/sellers/:id/ledger" element={<SellerLedgerPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/change-password" element={<ChangePasswordPage />} />
          <Route path="/analytics" element={<OrderAnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      {toaster}
    </>
  );
}
