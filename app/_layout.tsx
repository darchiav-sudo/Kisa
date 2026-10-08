import { DarkTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { colors } from '@/src/theme/colors';
import { useAppStore } from '@/src/store/useAppStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.line,
    primary: colors.green,
  },
};

export default function RootLayout() {
  const hydrated = useAppStore((s) => s.hydrated);

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
        <ActivityIndicator color={colors.green} />
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
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="money-profile" options={{ title: 'Money profile' }} />
        <Stack.Screen name="business-profile" options={{ title: 'Business profile' }} />
        <Stack.Screen name="analysis" options={{ headerShown: false }} />
        <Stack.Screen name="launches/index" options={{ title: 'Your launches' }} />
        <Stack.Screen name="launches/[id]/index" options={{ title: 'Launch' }} />
        <Stack.Screen name="launches/[id]/run" options={{ title: 'Run launch' }} />
        <Stack.Screen name="done" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
