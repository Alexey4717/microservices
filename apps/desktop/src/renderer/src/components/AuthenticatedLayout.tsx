import type { ReactNode } from 'react';

import { AppNav } from './AppNav';
import styles from './AuthenticatedLayout.module.scss';

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className={styles.screen}>
      <AppNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
