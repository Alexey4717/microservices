import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/lib/theme';

type UserAvatarProps = {
  src?: string | null;
  alt: string;
  size: number;
  name?: string | null;
};

export function UserAvatar({ src, alt, size, name }: UserAvatarProps) {
  const palette = usePalette();

  if (src) {
    return (
      <Image
        accessibilityLabel={alt}
        source={{ uri: src }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.border,
        }}
      />
    );
  }

  const letter = (name?.trim()?.[0] || alt.trim()[0] || '?').toLocaleUpperCase(
    'ru-RU',
  );

  return (
    <View
      accessibilityLabel={alt}
      accessibilityRole="image"
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.border,
        },
      ]}
    >
      <Text style={{ color: palette.muted, fontSize: Math.round(size * 0.4) }}>
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
