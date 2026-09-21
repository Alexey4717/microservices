import { NavLink } from 'react-router';

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основное меню">
      <NavLink to="/" end>
        Профиль
      </NavLink>
      <NavLink to="/videos">Видео</NavLink>
    </nav>
  );
}
