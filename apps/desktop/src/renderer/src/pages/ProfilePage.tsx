import { useQuery } from '@apollo/client/react';

import {
  MeDocument,
  type MeQuery,
} from '@libs/graphql/operations/user/me.generated';

import { Page } from '../components/Page';
import styles from './ProfilePage.module.scss';

type SessionUser = MeQuery['me'];

function tierLabel(tier: SessionUser['accountTier']): string {
  return tier === 'PREMIUM' ? 'Премиум' : 'Базовый';
}

export function ProfilePage() {
  const me = useQuery(MeDocument);
  const user = me.data?.me;
  const displayName = user?.name?.trim() || 'Без имени';

  return (
    <Page heading={user ? displayName : undefined} loading={me.loading}>
      {me.error || !user ? (
        <p className={styles.error} role="alert">
          Не удалось загрузить профиль.
        </p>
      ) : (
        <>
          <div className={styles.profileHeader}>
            <Avatar
              src={user.avatarUrl}
              alt={`Аватар ${displayName}`}
              name={displayName}
            />
            <p className={styles.muted}>{user.email}</p>
          </div>
          <span className={styles.tier}>{tierLabel(user.accountTier)}</span>
        </>
      )}
    </Page>
  );
}

type AvatarProps = {
  src?: string | null;
  alt: string;
  name: string;
};

function Avatar({ src, alt, name }: AvatarProps) {
  if (src) {
    return (
      <img
        className={styles.avatar}
        src={src}
        alt={alt}
        width={64}
        height={64}
      />
    );
  }

  const letter = (name.trim()[0] || '?').toLocaleUpperCase('ru-RU');

  return (
    <span className={styles.avatarFallback} role="img" aria-label={alt}>
      {letter}
    </span>
  );
}
