import { Avatar } from '../components/Avatar';
import type { SessionUser } from '../graphql';

function tierLabel(tier: SessionUser['accountTier']): string {
  return tier === 'PREMIUM' ? 'Премиум' : 'Базовый';
}

type ProfilePageProps = {
  user: SessionUser;
};

export function ProfilePage({ user }: ProfilePageProps) {
  const displayName = user.name?.trim() || 'Без имени';
  const avatarAlt = `Аватар ${displayName}`;

  return (
    <section className="page">
      <article className="card">
        <div className="profile-header">
          <Avatar src={user.avatarUrl} alt={avatarAlt} name={displayName} />
          <div>
            <h1 className="profile-name">{displayName}</h1>
            <p className="muted">{user.email}</p>
          </div>
        </div>
        <span className="tier">{tierLabel(user.accountTier)}</span>
      </article>
    </section>
  );
}
