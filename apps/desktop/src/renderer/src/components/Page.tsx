import type { ReactNode } from 'react';

import styles from './Page.module.scss';

type PageProps = {
  heading?: string;
  loading?: boolean;
  children: ReactNode;
};

export function Page({ heading, loading = false, children }: PageProps) {
  return (
    <section className={styles.page} aria-busy={loading}>
      {heading ? (
        <div className={styles.heading}>
          <h1>{heading}</h1>
        </div>
      ) : null}
      <div className={styles.body}>
        {loading ? (
          <p className={styles.loading} role="status">
            Загрузка…
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
