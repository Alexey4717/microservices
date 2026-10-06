import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { useEffect, useRef } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';

import { LoginWithTelegramDocument } from '@libs/graphql/operations/auth/login-with-telegram.generated';
import { MeDocument } from '@libs/graphql/operations/user/me.generated';

import { rememberAccessToken } from './auth-session';
import { BottomNav } from './components/BottomNav';
import { GateScreen, LOADING_GATE_MESSAGE } from './components/GateScreen';
import { ProfilePage } from './pages/ProfilePage';
import { VideosPage } from './pages/VideosPage';
import {
  getInitData,
  getTelegramWebApp,
  signalTelegramReady,
} from './telegram';

function BackButtonSync() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const backButton = getTelegramWebApp()?.BackButton;
    if (!backButton) {
      return;
    }

    if (location.pathname !== '/videos') {
      backButton.hide();
      return;
    }

    const onBack = () => {
      navigate('/');
    };
    backButton.show();
    backButton.onClick(onBack);
    return () => {
      backButton.offClick(onBack);
      backButton.hide();
    };
  }, [location.pathname, navigate]);

  return null;
}

export function App() {
  const started = useRef(false);
  const [loginWithTelegram, loginResult] = useMutation(
    LoginWithTelegramDocument,
  );
  const [loadMe, meResult] = useLazyQuery(MeDocument);

  useEffect(() => {
    signalTelegramReady();
    if (started.current) {
      return;
    }
    started.current = true;
    void loginWithTelegram({ variables: { initData: getInitData() } });
  }, [loginWithTelegram]);

  useEffect(() => {
    const accessToken = loginResult.data?.loginWithTelegram.accessToken;
    if (!accessToken || meResult.called) {
      return;
    }
    rememberAccessToken(accessToken);
    void loadMe();
  }, [loadMe, loginResult.data, meResult.called]);

  const user = meResult.data?.me;
  const error = loginResult.error ?? meResult.error;
  const message = gateMessage(error, meResult.called && !meResult.loading && !user);
  const loading = !user && !message;

  if (loading) {
    return <GateScreen message={LOADING_GATE_MESSAGE} pending />;
  }

  if (message || !user) {
    return <GateScreen message={message ?? 'Не удалось загрузить профиль.'} />;
  }

  return (
    <div className="app-shell">
      <BackButtonSync />
      <Routes>
        <Route path="/" element={<ProfilePage user={user} />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function gateMessage(
  error: unknown,
  emptyProfile: boolean,
): string | null {
  if (errorCode(error) === 'NOT_FOUND') {
    return 'Привяжите бота в профиле на сайте.';
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (error) {
    return 'Не удалось войти. Откройте кабинет кнопкой под сообщением.';
  }
  if (emptyProfile) {
    return 'Не удалось загрузить профиль.';
  }
  return null;
}

function errorCode(error: unknown): string | undefined {
  if (!CombinedGraphQLErrors.is(error)) {
    return undefined;
  }
  const code = error.errors[0]?.extensions?.code;
  return typeof code === 'string' ? code : undefined;
}
