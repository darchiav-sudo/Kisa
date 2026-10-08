import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pill, PrimaryButton, Sub, Title } from '@/src/components/ui';
import { selectTotalEarnings, useAppStore } from '@/src/store/useAppStore';
import { colors, radii, spacing } from '@/src/theme/colors';
import { services } from '@/src/services';

export default function WelcomeScreen() {
  const mode = useAppStore((s) => s.mode);
  const earnings = useAppStore((s) => s.earnings);
  const activeLaunchId = useAppStore((s) => s.activeLaunchId);
  const resetAll = useAppStore((s) => s.resetAll);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    services.analytics.track('welcome_view');
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  const usd = selectTotalEarnings('USD', earnings);
  const gel = selectTotalEarnings('GEL', earnings);

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['#173221', '#080a0e', '#0e131a', '#20364a']}
        locations={[0, 0.28, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.wrap, { opacity: fade, transform: [{ translateY: slide }] }]}>
        <View style={styles.top}>
          <Text style={styles.brand}>KISA</Text>
          <Pill>Money Launcher</Pill>
        </View>

        <Text style={styles.kicker}>APP PREPARES · YOU APPROVE</Text>
        <Title>Make the first money move without guessing.</Title>
        <Sub>
          Full auto where possible. One tap when needed. Guided only when a human must act. Never spend
          before signal.
        </Sub>

        {(usd > 0 || gel > 0) && (
          <View style={styles.earnBanner}>
            <Text style={styles.earnLabel}>Demo earnings</Text>
            <Text style={styles.earnValue}>
              {usd > 0 ? `$${usd.toFixed(0)}` : ''}
              {usd > 0 && gel > 0 ? ' · ' : ''}
              {gel > 0 ? `${gel.toFixed(0)}₾` : ''}
            </Text>
          </View>
        )}

        <View style={styles.modes}>
          <Pressable
            onPress={() => {
              services.analytics.track('mode_select', { mode: 'money' });
              router.push('/money-profile');
            }}
            style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
          >
            <Text style={styles.modeTitle}>I need a way to make money</Text>
            <Text style={styles.modeSub}>Profile → ranked launches → execute primary</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              services.analytics.track('mode_select', { mode: 'business' });
              router.push('/business-profile');
            }}
            style={({ pressed }) => [styles.modeCard, styles.modeCardAlt, pressed && styles.pressed]}
          >
            <Text style={styles.modeTitle}>I already have a business / product</Text>
            <Text style={styles.modeSub}>Sales launches for what you sell now</Text>
          </Pressable>
        </View>

        {mode && activeLaunchId ? (
          <View style={{ marginTop: spacing.lg, gap: 10 }}>
            <PrimaryButton
              label="Resume active launch"
              onPress={() => router.push(`/launches/${activeLaunchId}/run`)}
            />
            <PrimaryButton
              label="See my launches"
              onPress={() => router.push('/launches')}
            />
          </View>
        ) : null}

        <Pressable onPress={resetAll} style={styles.reset}>
          <Text style={styles.resetText}>Reset demo data</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  kicker: {
    marginTop: 28,
    color: colors.green,
    fontWeight: '900',
    letterSpacing: 1.3,
    fontSize: 12,
  },
  modes: { marginTop: 28, gap: 10 },
  modeCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#111720',
    padding: 16,
  },
  modeCardAlt: {
    backgroundColor: '#121a26',
    borderColor: '#304158',
  },
  modeTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  modeSub: { color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  earnBanner: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldDim,
  },
  earnLabel: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  earnValue: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  reset: { marginTop: 'auto', alignItems: 'center', paddingTop: 20 },
  resetText: { color: '#7f8c9c', fontSize: 12 },
});
