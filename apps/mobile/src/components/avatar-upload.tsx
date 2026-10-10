import { useMutation } from '@apollo/client/react';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MeDocument } from '@libs/graphql/operations/user/me.generated';
import { UploadAvatarDocument } from '@libs/graphql/operations/user/upload-avatar.generated';

import { UserAvatar } from '@/components/user-avatar';
import { Muted, SecondaryButton } from '@/components/ui';
import {
  avatarValidationMessage,
  mimeFromFileName,
  normalizeAvatarMime,
  validateAvatarFile,
  type AvatarUploadFile,
} from '@/lib/avatar';
import { uploadErrorMessage } from '@/lib/graphql-error';
import type { AuthUser } from '@/lib/session';
import { usePalette } from '@/lib/theme';

type AvatarUploadProps = {
  user: AuthUser;
};

export function AvatarUpload({ user }: AvatarUploadProps) {
  const palette = usePalette();
  const [upload, { loading }] = useMutation(UploadAvatarDocument, {
    refetchQueries: [{ query: MeDocument }],
  });
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const displayUrl = previewUri ?? user.avatarUrl ?? null;
  const displayName = user.name?.trim() || user.email;

  async function onPick() {
    if (loading) {
      return;
    }
    setStatus(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Нужен доступ к фото, чтобы выбрать аватар.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) {
      return;
    }

    const asset = picked.assets[0];
    const mime = normalizeAvatarMime(
      asset.mimeType ||
        asset.file?.type ||
        mimeFromFileName(asset.fileName || asset.uri),
    );
    const size = await resolveSize(asset);
    const validation = validateAvatarFile({ type: mime, size });
    if (validation) {
      setPreviewUri(null);
      setError(avatarValidationMessage(validation));
      return;
    }

    const name =
      asset.fileName ||
      asset.file?.name ||
      `avatar.${mime === 'image/jpeg' ? 'jpg' : mime.slice('image/'.length)}`;
    const nativeFile: AvatarUploadFile = {
      uri: asset.uri,
      name,
      type: mime,
    };
    const file = asset.file ?? nativeFile;

    setPreviewUri(asset.uri);
    setError(null);

    try {
      const result = await upload({
        variables: { file: file as File },
      });
      const nextUrl = result.data?.uploadAvatar.avatarUrl ?? null;
      setPreviewUri(null);
      if (nextUrl) {
        setStatus('Аватар обновлён');
      }
    } catch (uploadError) {
      setPreviewUri(null);
      setError(uploadErrorMessage(uploadError));
    }
  }

  return (
    <View style={styles.row}>
      <UserAvatar
        alt={
          displayUrl ? `Аватар ${displayName}` : `Нет аватара, ${displayName}`
        }
        name={displayName}
        size={96}
        src={displayUrl}
      />
      <View style={styles.copy}>
        <Muted>
          {displayUrl
            ? 'Текущее фото профиля. Можно заменить JPEG, PNG, WebP или GIF до 2\u00a0МБ.'
            : 'Аватар не выбран. Загрузите JPEG, PNG, WebP или GIF до 2\u00a0МБ.'}
        </Muted>
        <SecondaryButton
          disabled={loading}
          label={loading ? 'Загружаем…' : 'Выбрать аватар'}
          onPress={() => {
            void onPick();
          }}
        />
        {loading ? <Muted>Загружаем…</Muted> : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: palette.danger }}>
            {error}
          </Text>
        ) : null}
        {status && !error ? <Muted>{status}</Muted> : null}
      </View>
    </View>
  );
}

async function resolveSize(
  asset: ImagePicker.ImagePickerAsset,
): Promise<number | null> {
  if (typeof asset.fileSize === 'number') {
    return asset.fileSize;
  }
  if (asset.file) {
    return asset.file.size;
  }
  try {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  row: {
    gap: 16,
  },
  copy: {
    gap: 8,
    flexShrink: 1,
  },
});
