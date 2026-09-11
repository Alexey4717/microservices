export default function HomePage() {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">Главная</h1>
      <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
        Добро пожаловать. Откройте профиль, чтобы увидеть данные текущего
        пользователя, или загляните в раздел видео.
      </p>
    </section>
  );
}
