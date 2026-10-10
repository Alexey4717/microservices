import { Redirect, Slot } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { BootScreen } from '@/components/ui';
import { useSession } from '@/lib/session';
import { usePalette } from '@/lib/theme';

export default function AppLayout() {
  const { ready, user } = useSession();
  const palette = usePalette();

  if (!ready) {
    return <BootScreen />;
  }
  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <AppHeader />
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}
