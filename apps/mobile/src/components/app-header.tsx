import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@/components/user-avatar';
import { useSession } from '@/lib/session';
import { usePalette } from '@/lib/theme';

export function AppHeader() {
  const palette = usePalette();
  const { user, signOut } = useSession();
  const displayName = user?.name?.trim() || user?.email || '';

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: palette.card, borderBottomColor: palette.border },
      ]}
    >
      <Text style={[styles.brand, { color: palette.text }]}>Видеосервис</Text>
      <View style={styles.nav}>
        <NavLink href="/" label="Главная" />
        <NavLink href="/videos" label="Видео" />
        <NavLink href="/profile" label="Профиль" />
      </View>
      <View style={styles.side}>
        {user ? (
          <Link href="/profile" asChild>
            <Pressable style={styles.user}>
              <UserAvatar
                alt={`Аватар ${displayName}`}
                name={displayName}
                size={28}
                src={user.avatarUrl}
              />
              <Text
                numberOfLines={1}
                style={[styles.userName, { color: palette.muted }]}
              >
                {displayName}
              </Text>
              {user.accountTier === 'PREMIUM' ? (
                <View
                  style={[styles.badge, { backgroundColor: palette.buttonBg }]}
                >
                  <Text style={{ color: palette.buttonText, fontSize: 10 }}>
                    PREMIUM
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </Link>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut();
          }}
          style={[styles.logout, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.text, fontSize: 14 }}>Выйти</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NavLink({
  href,
  label,
}: {
  href: '/' | '/videos' | '/profile';
  label: string;
}) {
  const palette = usePalette();
  return (
    <Link href={href} asChild>
      <Pressable>
        <Text style={[styles.navText, { color: palette.text }]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  brand: {
    fontSize: 18,
    fontWeight: '700',
  },
  nav: {
    flexDirection: 'row',
    gap: 16,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  userName: {
    maxWidth: 140,
    fontSize: 14,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  logout: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
