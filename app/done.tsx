import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton, Sub } from '@/src/components/ui';
import { getLaunchById } from '@/src/data/launches';
import { selectTotalEarnings, useAppStore } from '@/src/store/useAppStore';
import { colors, spacing } from '@/src/theme/colors';

export default function DoneScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const launch = getLaunchById(String(id));
  const earnings = useAppStore((s) => s.earnings);
  const resetLaunchProgress = useAppStore((s) => s.resetLaunchProgress);
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [scale]);

  const currency = launch?.economics.currency ?? 'USD';
  const total = selectTotalEarnings(currency, earnings);
  const last = earnings.find((e) => e.launchId === String(id));

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#173d29', '#080a0e']} style={StyleSheet.absoluteFill} />
      <View style={styles.wrap}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Text style={styles.badge}>FIRST MONEY</Text>
          <Text style={styles.amount}>
            {currency === 'USD' ? `$${last?.amount ?? total}` : `${last?.amount ?? total}₾`}
          </Text>
          <Text style={styles.title}>Payment recorded</Text>
          <Sub>
            {launch
              ? `${launch.title} — demo loop complete. Repeat the launch or pick another channel.`
              : 'Demo loop complete.'}
          </Sub>
        </Animated.View>

        <View style={{ marginTop: 36, gap: 10, width: '100%' }}>
          {launch ? (
            <PrimaryButton
              label="Repeat this launch"
              onPress={() => {
                resetLaunchProgress(launch.id);
                router.replace(`/launches/${launch.id}/run`);
              }}
            />
          ) : null}
          <PrimaryButton label="See all launches" onPress={() => router.replace('/launches')} />
          <SecondaryButton label="Home" onPress={() => router.replace('/')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    color: colors.green,
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 12,
  },
  amount: {
    color: colors.gold,
    fontSize: 56,
    fontWeight: '900',
    marginTop: 10,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 8,
  },
});
