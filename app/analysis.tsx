import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/src/components/ui';
import { services } from '@/src/services';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, spacing } from '@/src/theme/colors';

const LINES = [
  'Reading your constraints…',
  'Checking demand signals…',
  'Drafting offers…',
  'Ranking distribution paths…',
  'LAUNCH READY',
];

export default function AnalysisScreen() {
  const mode = useAppStore((s) => s.mode);
  const moneyProfile = useAppStore((s) => s.moneyProfile);
  const businessProfile = useAppStore((s) => s.businessProfile);
  const markAnalysis = useAppStore((s) => s.markAnalysis);
  const [lineIndex, setLineIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      services.analytics.track('analysis_start', { mode: mode ?? 'unknown' });
      if (mode === 'money' && moneyProfile) {
        await services.launchGeneration.generate('money', moneyProfile);
      } else if (mode === 'business' && businessProfile) {
        await services.launchGeneration.generate('business', businessProfile);
      }
      for (let i = 0; i < LINES.length; i++) {
        if (cancelled) return;
        setLineIndex(i);
        await new Promise((r) => setTimeout(r, i === LINES.length - 1 ? 400 : 550));
      }
      if (cancelled) return;
      markAnalysis();
      setReady(true);
      services.analytics.track('analysis_ready', { mode: mode ?? 'unknown' });
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, moneyProfile, businessProfile, markAnalysis]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Animated.View style={[styles.orb, { opacity: pulse }]} />
        <Text style={styles.line}>{LINES[lineIndex]}</Text>
        <Text style={styles.hint}>
          {mode === 'business'
            ? 'Building sales launches for your product…'
            : 'Matching local opportunities to your budget & time…'}
        </Text>
        {ready ? (
          <View style={{ marginTop: 28, width: '100%', paddingHorizontal: spacing.xl }}>
            <PrimaryButton label="See launches" onPress={() => router.replace('/launches')} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.greenDim,
    borderWidth: 2,
    borderColor: colors.green,
    marginBottom: 28,
  },
  line: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  hint: {
    color: colors.muted,
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
