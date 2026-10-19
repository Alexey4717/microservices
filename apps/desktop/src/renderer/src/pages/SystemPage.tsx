import { useEffect, useState } from 'react';

import type { DesktopPreferences } from '../../../shared/desktop-preferences';
import type { OpenTextResult } from '../../../shared/file-payload';
import type { CrashStatus } from '../../../shared/system-state';
import type { UpdateStatus } from '../../../shared/update-channel';
import { Page } from '../components/Page';
import { desktopErrorText, desktopSystem } from '../desktop-system';
import styles from './SystemPage.module.scss';

export function SystemPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<DesktopPreferences | null>(null);
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [filePreview, setFilePreview] = useState<OpenTextResult | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [crashStatus, setCrashStatus] = useState<CrashStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let desktop: ReturnType<typeof desktopSystem>;
    try {
      desktop = desktopSystem();
    } catch (loadError) {
      setError(desktopErrorText(loadError));
      setReady(true);
      return;
    }

    let cancelled = false;
    void Promise.all([
      desktop.getPreferences(),
      desktop.getLoginItem(),
      desktop.getUpdateStatus(),
      desktop.getCrashStatus(),
    ])
      .then(([preferences, loginItem, updates, crash]) => {
        if (cancelled) {
          return;
        }
        setPrefs(preferences);
        setOpenAtLogin(loginItem.openAtLogin);
        setUpdateStatus(updates);
        setCrashStatus(crash);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(desktopErrorText(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    const unsubscribe = desktop.onPreferencesChanged((next) => {
      setPrefs(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function onMinimize(): Promise<void> {
    if (!prefs) {
      return;
    }
    setBusy('tray');
    setError(null);
    try {
      setPrefs(await desktopSystem().setMinimizeToTray(!prefs.minimizeToTray));
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function onNotifications(): Promise<void> {
    if (notificationsOn) {
      setNotificationsOn(false);
      return;
    }
    setBusy('notify');
    setError(null);
    try {
      const shown = await desktopSystem().showNotification();
      if (!shown) {
        setError('Уведомления на этой системе недоступны.');
        return;
      }
      setNotificationsOn(true);
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function onLoginItem(): Promise<void> {
    setBusy('login');
    setError(null);
    try {
      const next = await desktopSystem().setLoginItem(!openAtLogin);
      setOpenAtLogin(next.openAtLogin);
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function onOpenFile(): Promise<void> {
    setBusy('open');
    setError(null);
    try {
      setFilePreview(await desktopSystem().openTextFile());
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function onSaveReport(): Promise<void> {
    if (!prefs || !updateStatus) {
      return;
    }
    setBusy('save');
    setError(null);
    try {
      const saved = await desktopSystem().saveReport(
        buildReport({
          minimizeToTray: prefs.minimizeToTray,
          openAtLogin,
          notificationsOn,
          updateText: updateLabel(updateStatus),
          crash: crashStatus,
        }),
      );
      if (saved) {
        setSavedPath(saved.path);
      }
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function onReveal(): Promise<void> {
    if (!savedPath) {
      return;
    }
    setBusy('reveal');
    setError(null);
    try {
      await desktopSystem().showItemInFolder(savedPath);
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  async function onCheckUpdates(): Promise<void> {
    setBusy('update');
    setError(null);
    try {
      setUpdateStatus(await desktopSystem().checkForUpdates());
    } catch (actionError) {
      setError(desktopErrorText(actionError));
    } finally {
      setBusy(null);
    }
  }

  function onCrash(): void {
    setBusy('crash');
    setError(null);
    void desktopSystem()
      .crashRenderer()
      .catch((actionError: unknown) => {
        setBusy(null);
        setError(desktopErrorText(actionError));
      });
  }

  const updateText = updateStatus ? updateLabel(updateStatus) : '';
  const checkDisabled =
    busy !== null ||
    updateStatus?.state === 'unconfigured' ||
    updateStatus?.state === 'invalid';

  return (
    <Page heading="Система" loading={!ready}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="system-tray">
        <h2 id="system-tray" className={styles.sectionTitle}>
          Окно
        </h2>
        <div className={styles.actions}>
          <Toggle
            pressed={prefs?.minimizeToTray === true}
            disabled={busy !== null || !prefs}
            onClick={() => {
              void onMinimize();
            }}
          >
            Сворачивать в трей
          </Toggle>
        </div>
        <p className={styles.muted}>
          {prefs?.minimizeToTray
            ? 'Закрытие окна сворачивает приложение в трей.'
            : 'Пока выключено, закрытие окна завершает приложение.'}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="system-notify">
        <h2 id="system-notify" className={styles.sectionTitle}>
          Уведомления
        </h2>
        <div className={styles.actions}>
          <Toggle
            pressed={notificationsOn}
            disabled={busy !== null}
            onClick={() => {
              void onNotifications();
            }}
          >
            Уведомления
          </Toggle>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="system-login">
        <h2 id="system-login" className={styles.sectionTitle}>
          Автозапуск
        </h2>
        <div className={styles.actions}>
          <Toggle
            pressed={openAtLogin}
            disabled={busy !== null}
            onClick={() => {
              void onLoginItem();
            }}
          >
            Запускать при входе в систему
          </Toggle>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="system-files">
        <h2 id="system-files" className={styles.sectionTitle}>
          Файлы
        </h2>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy !== null}
            onClick={() => {
              void onOpenFile();
            }}
          >
            Открыть текстовый файл
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy !== null || !prefs}
            onClick={() => {
              void onSaveReport();
            }}
          >
            Сохранить отчёт
          </button>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy !== null || !savedPath}
            onClick={() => {
              void onReveal();
            }}
          >
            Показать в папке
          </button>
        </div>
        {filePreview ? (
          <>
            <p className={styles.path}>{filePreview.path}</p>
            <pre className={styles.preview}>{filePreview.preview}</pre>
            {filePreview.truncated ? (
              <p className={styles.muted}>Показано начало файла.</p>
            ) : null}
          </>
        ) : (
          <p className={styles.muted}>Текстовый файл ещё не открыт.</p>
        )}
        {savedPath ? <p className={styles.path}>{savedPath}</p> : null}
      </section>

      <section className={styles.section} aria-labelledby="system-updates">
        <h2 id="system-updates" className={styles.sectionTitle}>
          Обновления
        </h2>
        <p className={styles.muted} role="status">
          {updateText}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={checkDisabled}
            onClick={() => {
              void onCheckUpdates();
            }}
          >
            Проверить обновления
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="system-crash">
        <h2 id="system-crash" className={styles.sectionTitle}>
          Сбои
        </h2>
        {crashStatus?.hadTrainingCrash ? (
          <p className={styles.path} role="status">
            Учебное падение рендерера. Каталог дампов:{' '}
            {crashStatus.dumpDirectory}
          </p>
        ) : (
          <p className={styles.muted}>
            Кнопка завершает процесс рендерера. Главный процесс остаётся
            работать, окно перезагружается.
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy !== null}
            onClick={onCrash}
          >
            Уронить рендерер
          </button>
        </div>
        <p className={styles.muted}>
          Ссылка cabinet://open/system открывает эту страницу.
        </p>
      </section>
    </Page>
  );
}

function Toggle({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function updateLabel(status: UpdateStatus): string {
  switch (status.state) {
    case 'unconfigured':
      return 'Канал обновлений не задан.';
    case 'invalid':
      return 'Адрес канала обновлений некорректен.';
    case 'unpackaged':
      return 'Проверка обновлений запускается только в установленной сборке.';
    case 'idle':
      return 'Канал задан. Проверка ещё не запускалась.';
    case 'available':
      return status.version
        ? `Доступна версия ${status.version}.`
        : 'Доступно обновление.';
    case 'not-available':
      return 'Обновлений нет.';
    case 'error':
      return 'Не удалось проверить обновления.';
  }
}

function buildReport(input: {
  minimizeToTray: boolean;
  openAtLogin: boolean;
  notificationsOn: boolean;
  updateText: string;
  crash: CrashStatus | null;
}): string {
  const lines = [
    'Отчёт стенда «Кабинет»',
    `Сворачивать в трей: ${input.minimizeToTray ? 'да' : 'нет'}`,
    `Запуск при входе: ${input.openAtLogin ? 'да' : 'нет'}`,
    `Уведомления: ${input.notificationsOn ? 'включены' : 'выключены'}`,
    `Обновления: ${input.updateText}`,
  ];
  if (input.crash?.hadTrainingCrash) {
    lines.push(`Каталог дампов: ${input.crash.dumpDirectory}`);
  }
  return lines.join('\n');
}
