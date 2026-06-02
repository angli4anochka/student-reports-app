import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// ─── Immediate Components (small, critical for initial render) ─────────
import Layout from './components/Layout';
import Login from './components/Login';
import GoogleAuthSuccess from './components/GoogleAuthSuccess';

// ─── Lazy Loaded Components (large, non-critical) ─────────────────────
const Register = lazy(() => import('./components/Register'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const CreateFirstAdmin = lazy(() => import('./components/CreateFirstAdmin'));
const LandingPage = lazy(() => import('./components/LandingPage'));

// VK Mini App (student-facing, runs inside vk.com — no teacher auth)
const VKMiniApp = lazy(() => import('./components/vk/VKMiniApp'));

// Lazy load the heavy dashboard components
const Dashboard = lazy(() => import('./components/Dashboard'));
const TelegramSettings = lazy(() =>
  import('./components/TelegramSettings').then(module => ({
    default: module.TelegramSettings
  }))
);
const OrganizationDashboard = lazy(() =>
  import('./components/OrganizationDashboard').then(module => ({
    default: module.OrganizationDashboard
  }))
);

// Lazy load decomposed components
const TeacherEarnings = lazy(() =>
  import('./components/earnings/EarningsDashboard').then(module => ({
    default: module.EarningsDashboard
  }))
);
const ManagementDashboard = lazy(() =>
  import('./components/management/ManagementDashboard').then(module => ({
    default: module.ManagementDashboard
  }))
);

// ─── Loading Fallback Component ────────────────────────────────────────
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Загрузка...' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    gap: '1rem'
  }}>
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <p className="text-slate-600">{message}</p>
  </div>
);

// ─── Suspense Wrapper ──────────────────────────────────────────────────
const SuspenseWrapper: React.FC<{ children: React.ReactNode; fallback?: string }> = ({
  children,
  fallback = 'Загрузка...'
}) => (
  <Suspense fallback={<LoadingSpinner message={fallback} />}>
    {children}
  </Suspense>
);

// ─── Private Route Component ───────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Проверка авторизации..." />;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

// ─── App Content Component ─────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  // Show landing page for non-authenticated users
  const HomeRoute = () => {
    if (loading) {
      return <LoadingSpinner message="Проверка авторизации..." />;
    }

    if (user) {
      return (
        <Layout>
          <SuspenseWrapper fallback="Загрузка панели управления...">
            <Dashboard />
          </SuspenseWrapper>
        </Layout>
      );
    }

    return (
      <SuspenseWrapper fallback="Загрузка главной страницы...">
        <LandingPage />
      </SuspenseWrapper>
    );
  };

  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/vk"
        element={
          <SuspenseWrapper fallback="Загрузка…">
            <VKMiniApp />
          </SuspenseWrapper>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/google/success" element={<GoogleAuthSuccess />} />
      <Route
        path="/register"
        element={
          <SuspenseWrapper fallback="Загрузка регистрации...">
            <Register />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <SuspenseWrapper fallback="Загрузка...">
            <ForgotPassword />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/reset-password"
        element={
          <SuspenseWrapper fallback="Загрузка...">
            <ResetPassword />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/create-first-admin"
        element={
          <SuspenseWrapper fallback="Загрузка...">
            <CreateFirstAdmin />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <SuspenseWrapper fallback="Загрузка панели управления...">
                <Dashboard />
              </SuspenseWrapper>
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/telegram"
        element={
          <PrivateRoute>
            <Layout>
              <SuspenseWrapper fallback="Загрузка настроек Telegram...">
                <TelegramSettings />
              </SuspenseWrapper>
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/organization"
        element={
          <PrivateRoute>
            <Layout>
              <SuspenseWrapper fallback="Загрузка организации...">
                <OrganizationDashboard />
              </SuspenseWrapper>
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/earnings"
        element={
          <PrivateRoute>
            <Layout>
              <SuspenseWrapper fallback="Загрузка заработков...">
                <TeacherEarnings />
              </SuspenseWrapper>
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/management"
        element={
          <PrivateRoute>
            <Layout>
              <SuspenseWrapper fallback="Загрузка управления...">
                <ManagementDashboard />
              </SuspenseWrapper>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

// ─── Main App Component ────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;