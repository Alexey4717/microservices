import { useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';

import { rememberAccessToken } from './auth-session';
import { BottomNav } from './components/BottomNav';
import { GateScreen, LOADING_GATE_MESSAGE } from './components/GateScreen';
import {
  fetchMe,
  GraphqlRequestError,
  loginWithTelegram,
  type SessionUser,
} from './graphql';
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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    signalTelegramReady();
    const initData = getInitData();
    let cancelled = false;

    async function signIn() {
      try {
        const session = await loginWithTelegram(initData);
        rememberAccessToken(session.accessToken);
        const profile = await fetchMe(session.accessToken);
        if (!cancelled) {
          setUser(profile);
        }
      } catch (caught) {
        if (cancelled) {
          return;
        }
        if (
          caught instanceof GraphqlRequestError &&
          caught.code === 'NOT_FOUND'
        ) {
          setError('Привяжите бота в профиле на сайте.');
          return;
        }
        setError(
          caught instanceof Error && caught.message.trim()
            ? caught.message
            : 'Не удалось войти. Откройте кабинет кнопкой под сообщением.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void signIn();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <GateScreen message={LOADING_GATE_MESSAGE} pending />;
  }

  if (error || !user) {
    return <GateScreen message={error ?? 'Не удалось загрузить профиль.'} />;
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
