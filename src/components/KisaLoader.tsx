import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

const native = Platform.OS !== 'web';

/**
 * Radar-style loader: pulsing rings and a spinning arc around a live percentage, a rotating
 * status line and a progress bar that eases toward `expectedMs` and fills when `done`.
 */
export function KisaLoader({
  title,
  lines,
  expectedMs,
  done,
  steps,
}: {
  title: string;
  lines: string[];
  expectedMs: number;
  done?: boolean;
  /** Optional checklist; the active item is derived from progress. */
  steps?: string[];
}) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const lineFade = useRef(new Animated.Value(1)).current;
  const [line, setLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    const loops = [
      ...rings.map((r, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 1100),
            Animated.timing(r, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: native }),
            Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: native }),
          ]),
        ),
      ),
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: native }),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(breathe, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      Animated.timing(lineFade, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => {
        setLine((l) => (l + 1) % lines.length);
        Animated.timing(lineFade, { toValue: 1, duration: 260, useNativeDriver: native }).start();
      });
    }, 3200);
    return () => clearInterval(id);
  }, [lines.length, lineFade]);

  useEffect(() => {
    if (done) {
      setProgress(1);
      return;
    }
    started.current = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - started.current) / expectedMs;
      // Approaches 95% around the expected time, then keeps creeping.
      setProgress(Math.min(0.97, 1 - Math.exp(-2.6 * t)));
    }, 200);
    return () => clearInterval(id);
  }, [done, expectedMs]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const coreScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const activeStep = steps ? Math.min(steps.length - 1, Math.floor(progress * steps.length)) : 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        {rings.map((r, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.1] }) }],
              },
            ]}
          />
        ))}
        <Animated.View style={[styles.arc, { transform: [{ rotate }] }]} />
        <Animated.View style={[styles.core, { transform: [{ scale: coreScale }] }]}>
          {done ? (
            <Ionicons name="checkmark" size={38} color={colors.white} />
          ) : (
            <Text style={styles.percent}>
              {Math.round(progress * 100)}
              <Text style={styles.percentSign}>%</Text>
            </Text>
          )}
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Animated.Text style={[styles.line, { opacity: lineFade }]}>{lines[line]}</Animated.Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {steps ? (
        <View style={styles.steps}>
          {steps.map((s, i) => {
            const state = done || i < activeStep ? 'done' : i === activeStep ? 'active' : 'todo';
            return (
              <View key={s} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepMark,
                    state === 'done' && styles.stepMarkDone,
                    state === 'active' && styles.stepMarkActive,
                  ]}
                >
                  {state === 'done' ? <Ionicons name="checkmark" size={13} color={colors.black} /> : null}
                </View>
                <Text
                  style={[
                    styles.stepText,
                    state === 'done' && { color: colors.mutedSoft },
                    state === 'active' && { color: colors.text },
                  ]}
                >
                  {s}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const STAGE = 180;
const CORE = 92;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 28 },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ring: {
    position: 'absolute',
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  arc: {
    position: 'absolute',
    width: CORE + 26,
    height: CORE + 26,
    borderRadius: (CORE + 26) / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    borderTopColor: colors.white,
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  percentSign: { fontSize: 15, color: colors.muted, fontWeight: '700' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  line: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 8, minHeight: 21 },
  track: {
    marginTop: 22,
    width: '78%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.white },
  steps: { marginTop: 28, gap: 12, alignSelf: 'stretch', paddingHorizontal: 18 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkDone: { backgroundColor: colors.white, borderColor: colors.white },
  stepMarkActive: { borderColor: colors.white },
  stepText: { color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: '600' },
});
