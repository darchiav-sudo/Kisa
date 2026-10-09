import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { exchangeCode } from '@/src/lib/auth';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

/** Landing route for the Google sign-in redirect. Finishes the sign-in itself in case the auth session never resolves. */
export default function AuthRedirectScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    let alive = true;
    const leave = () => {
      if (!alive) return;
      if (useAppStore.getState().user) router.replace('/');
      else router.replace('/sign-in');
    };
    if (!code) {
      const t = setTimeout(leave, 300);
      return () => clearTimeout(t);
    }
    exchangeCode(code)
      .then((result) => {
        if (result.ok) useAppStore.getState().setUser(result.user);
      })
      .catch(() => undefined)
      .finally(leave);
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.blueBright} />
    </View>
  );
}
