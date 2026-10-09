import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KisaLoader } from '@/src/components/KisaLoader';
import { Backdrop, PrimaryButton, SecondaryButton, tap } from '@/src/components/ui';
import { createBusiness } from '@/src/lib/business';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

const STEPS = [
  'Naming your business',
  'Setting your price',
  'Building your website',
  'Writing your posts',
  'Preparing reply scripts',
  'Planning today’s tasks',
];

const LINES = [
  'Kisa is doing the hard part…',
  'Researching what works near you…',
  'Writing everything in your language…',
  'Almost there…',
];

export default function BuildingScreen() {
  const intake = useAppStore((s) => s.intake);
  const idea = useAppStore((s) => s.pendingIdea);
  const setPendingIdea = useAppStore((s) => s.setPendingIdea);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!intake || !idea) {
      router.dismissTo('/');
      return;
    }
    let cancelled = false;
    setError(null);
    setDone(false);
    (async () => {
      try {
        await createBusiness(intake, idea);
        if (cancelled) return;
        tap('success');
        setDone(true);
        setPendingIdea(null);
        setTimeout(() => router.dismissTo('/'), 900);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Something went wrong.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={styles.safe}>
        {error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline" size={44} color={colors.blueBright} />
            <Text style={styles.errorTitle}>Kisa got stuck</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.actions}>
              <PrimaryButton label="Try again" onPress={() => setAttempt((a) => a + 1)} />
              <SecondaryButton
                label="Back to the idea"
                onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
              />
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.ideaLine} numberOfLines={1}>
              {idea?.emoji} {idea?.title}
            </Text>
            <KisaLoader
              title={done ? 'Your business is ready!' : 'Building your business'}
              lines={LINES}
              expectedMs={14000}
              done={done}
              steps={STEPS}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  ideaLine: { color: colors.muted, fontSize: 14, fontWeight: '700', marginBottom: 18 },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 16 },
  errorText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 26 },
});
