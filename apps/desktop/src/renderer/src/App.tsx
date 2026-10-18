import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { AuthenticatedLayout } from './components/AuthenticatedLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { useSession } from './session-context';

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/"
        element={
          <RequireSession>
            <HomePage />
          </RequireSession>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireSession>
            <ProfilePage />
          </RequireSession>
        }
      />
      <Route path="*" element={<UnknownRedirect />} />
    </Routes>
  );
}

function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function UnknownRedirect() {
  const { status } = useSession();
  return <Navigate to={status === 'authenticated' ? '/' : '/login'} replace />;
}
