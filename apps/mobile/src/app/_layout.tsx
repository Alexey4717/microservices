import { ApolloProvider } from '@apollo/client/react';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { apolloClient } from '@/lib/apollo';
import { SessionProvider } from '@/lib/session';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <SessionProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
