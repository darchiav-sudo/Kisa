import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop, IconName, Logo, tap } from '@/src/components/ui';
import { signInWithGoogle } from '@/src/lib/auth';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii } from '@/src/theme/colors';

const native = Platform.OS !== 'web';

const POINTS: { icon: IconName; color: string; text: string }[] = [
  { icon: 'search', color: colors.blueBright, text: 'Finds an easy-to-start business for you' },
  { icon: 'sparkles', color: colors.pink, text: 'Builds your website, price and posts' },
  { icon: 'trending-up', color: colors.cyan, text: 'Tells you exactly what to do each day' },
];

export default function SignInScreen() {
  const setUser = useAppStore((s) => s.setUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [enter]);

  const onGoogle = async () => {
    tap('medium');
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.ok) {
        tap('success');
        setUser(result.user);
        router.replace('/');
      } else if (!result.cancelled) {
        setError(`Google sign-in failed (${result.message}).`);
      }
    } catch (e) {
      setError((e as Error).message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Animated.View style={{ opacity: enter, transform: [{ translateY: rise }], alignItems: 'center' }}>
            <Logo size={52} />
            <Text style={styles.tagline}>Your AI business partner</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.bottom, { opacity: enter, transform: [{ translateY: rise }] }]}>
          <View style={styles.points}>
            {POINTS.map((p) => (
              <View key={p.text} style={styles.point}>
                <View style={styles.pointIcon}>
                  <Ionicons name={p.icon} size={16} color={p.color} />
                </View>
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={onGoogle}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            style={({ pressed }) => [styles.google, (pressed || busy) && { opacity: 0.88, transform: [{ scale: 0.98 }] }]}
          >
            {busy ? (
              <ActivityIndicator color="#111" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.legal}>Free to start · Kisa never spends your money</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  tagline: { color: colors.muted, fontSize: 16, marginTop: 6, fontWeight: '600' },
  bottom: { paddingBottom: 18 },
  points: { gap: 12, marginBottom: 28 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pointText: { color: colors.mutedSoft, fontSize: 15, fontWeight: '600', flex: 1 },
  google: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.white,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  googleText: { color: '#111', fontSize: 16, fontWeight: '800' },
  error: { color: colors.danger, marginTop: 14, fontSize: 13, textAlign: 'center' },
  legal: { color: colors.faint, fontSize: 12, textAlign: 'center', marginTop: 16 },
});
