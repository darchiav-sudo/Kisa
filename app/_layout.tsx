import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, ThemeProvider, Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { SheetHost } from '@/src/components/Sheet';
import { setUnauthorizedHandler } from '@/src/lib/api';
import { fetchCurrentUser } from '@/src/lib/auth';
import { getSessionToken, setSessionToken } from '@/src/lib/session';
import { colors } from '@/src/theme/colors';
import { useAppStore } from '@/src/store/useAppStore';

const PUBLIC_ROUTES = ['sign-in', 'auth'];

function useAuthGate(hydrated: boolean) {
  const user = useAppStore((s) => s.user);
  const segments = useSegments();
  const onPublicRoute = PUBLIC_ROUTES.includes(segments[0] ?? '');

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void setSessionToken(null);
      useAppStore.getState().signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    (async () => {
      if (!(await getSessionToken())) {
        useAppStore.getState().signOut();
        return;
      }
      const fresh = await fetchCurrentUser().catch(() => null);
      if (fresh) useAppStore.getState().setUser(fresh);
    })();
    // Re-validate once per signed-in user, not on every profile refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    if (!user && !onPublicRoute) router.replace('/sign-in');
    else if (user && segments[0] === 'sign-in') router.replace('/');
  }, [hydrated, user, onPublicRoute, segments]);
}

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.line,
    primary: colors.blueBright,
  },
};

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);
  useAuthGate(hydrated);

  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync();
    }
  }, [hydrated]);

  // Fallback if persist rehydration is slow / missed
  useEffect(() => {
    const t = setTimeout(() => {
      if (!useAppStore.getState().hydrated) {
        useAppStore.getState().setHydrated(true);
      }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="paw" size={40} color={colors.blueBright} />
      </View>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="building" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="saved/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="business/checkin" options={{ title: 'Check-in', presentation: 'modal' }} />
        <Stack.Screen name="business/kit" options={{ title: 'Business kit' }} />
        <Stack.Screen name="business/lead/[id]" options={{ title: 'Order' }} />
      </Stack>
      <SheetHost />
    </ThemeProvider>
  );
}
