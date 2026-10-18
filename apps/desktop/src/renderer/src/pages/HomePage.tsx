import { Page } from '../components/Page';
import styles from './HomePage.module.scss';

export function HomePage() {
  return (
    <Page heading="Главная">
      <p className={styles.muted}>
        Кабинет открыт на этом компьютере. Учётная запись — в разделе «Профиль».
      </p>
    </Page>
  );
}
