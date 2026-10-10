import { Muted, Screen, Title } from '@/components/ui';

export default function HomeScreen() {
  return (
    <Screen>
      <Title>Главная</Title>
      <Muted>
        Добро пожаловать. Откройте профиль, чтобы увидеть данные текущего
        пользователя, или загляните в раздел видео.
      </Muted>
    </Screen>
  );
}
