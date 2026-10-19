import { NavLink, useNavigate } from 'react-router';

import { useSession } from '../session-context';
import styles from './AppNav.module.scss';

function linkClassName({ isActive }: { isActive: boolean }): string {
  return isActive ? `${styles.link} ${styles.linkActive}` : styles.link;
}

export function AppNav() {
  const navigate = useNavigate();
  const { signOut } = useSession();

  async function onLogout(): Promise<void> {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <header className={styles.bar}>
      <div className={styles.leading}>
        <span className={styles.brand}>Кабинет</span>
        <nav className={styles.tabs} aria-label="Разделы">
          <NavLink to="/" end className={linkClassName}>
            Главная
          </NavLink>
          <NavLink to="/profile" className={linkClassName}>
            Профиль
          </NavLink>
          <NavLink to="/system" className={linkClassName}>
            Система
          </NavLink>
        </nav>
      </div>
      <button
        type="button"
        className={styles.logout}
        onClick={() => {
          void onLogout();
        }}
      >
        Выйти
      </button>
    </header>
  );
}
