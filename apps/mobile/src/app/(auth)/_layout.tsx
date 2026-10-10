import { Redirect, Slot } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BootScreen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { usePalette } from '@/lib/theme';

export default function AuthLayout() {
  const { ready, user } = useSession();
  const palette = usePalette();

  if (!ready) {
    return <BootScreen />;
  }
  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <Slot />
    </SafeAreaView>
  );
}
