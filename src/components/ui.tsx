import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ComponentProps, ReactNode, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, gradients, radii } from '@/src/theme/colors';

export type IconName = ComponentProps<typeof Ionicons>['name'];

const native = Platform.OS !== 'web';

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (!native) return;
  if (kind === 'success') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  } else {
    void Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => undefined);
  }
}

/** Black backdrop with a faint deep blue at the bottom, used behind every screen. */
export function Backdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[...gradients.screen]}
        locations={[...gradients.screenLocations]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** "Kis" + a cat paw where the "a" would be. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.logoRow} accessibilityLabel="Kisa">
      <Text style={[styles.logoText, { fontSize: size, lineHeight: size * 1.1 }]}>Kis</Text>
      <View style={{ marginLeft: size * 0.04, marginTop: size * 0.12, transform: [{ rotate: '-14deg' }] }}>
        <Ionicons name="paw" size={size * 0.86} color={colors.blueBright} style={styles.logoPaw} />
      </View>
    </View>
  );
}

export function Title({ children, center }: { children: ReactNode; center?: boolean }) {
  return <Text style={[styles.title, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function Sub({ children, center }: { children: ReactNode; center?: boolean }) {
  return <Text style={[styles.sub, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/** Glass card with a soft gradient, like VS dating's chip surfaces. */
export function Card({
  children,
  active,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={active ? [...gradients.cardActive] : [...gradients.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, active && { borderColor: colors.blueBorder }, style]}
    >
      {children}
    </LinearGradient>
  );
}

/** Step indicator: small dots, the current one stretched into a white pill. */
export function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <View
      style={styles.dotsRow}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i === step ? styles.dotActive : i < step ? styles.dotDone : null]}
        />
      ))}
    </View>
  );
}

/**
 * The VS dating "men / women" button: dark rounded pill with a colored icon.
 * Selected → solid white with black text and a heartbeat pulse.
 */
export function OptionPill({
  label,
  icon,
  emoji,
  iconColor = colors.blueBright,
  selected,
  onPress,
  size = 'md',
  style,
}: {
  label: string;
  icon?: IconName;
  emoji?: string;
  iconColor?: string;
  selected: boolean;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasSelected = useRef(selected);

  useEffect(() => {
    if (selected && !wasSelected.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 110, useNativeDriver: native }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: native }),
      ]).start();
    }
    wasSelected.current = selected;
  }, [selected, scale]);

  const iconSize = size === 'sm' ? 15 : size === 'lg' ? 20 : 17;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [
          styles.pill,
          size === 'sm' && styles.pillSm,
          size === 'lg' && styles.pillLg,
          selected && styles.pillOn,
          pressed && { opacity: 0.85 },
        ]}
      >
        {icon ? <Ionicons name={icon} size={iconSize} color={iconColor} /> : null}
        {emoji ? <Text style={{ fontSize: iconSize }}>{emoji}</Text> : null}
        <Text
          numberOfLines={2}
          style={[
            styles.pillText,
            size === 'sm' && { fontSize: 13 },
            size === 'lg' && { fontSize: 16 },
            selected && styles.pillTextOn,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Main call to action. White glowing pill (VS dating), or blue gradient for "big moments". */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  tone = 'white',
  icon,
  chevron,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'white' | 'blue';
  icon?: IconName;
  chevron?: boolean;
}) {
  const blue = tone === 'blue';
  const fg = disabled ? colors.faint : blue ? colors.white : colors.black;
  const content = loading ? (
    <ActivityIndicator color={blue ? colors.white : colors.black} />
  ) : (
    <View style={styles.btnRow}>
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.primaryText, { color: fg }]}>{label}</Text>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={fg} /> : null}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap('medium');
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primary,
        !disabled && (blue ? styles.blueGlow : styles.whiteGlow),
        disabled ? styles.primaryDisabled : !blue && { backgroundColor: colors.white },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
    >
      {blue && !disabled ? (
        <LinearGradient
          colors={[...gradients.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radii.pill }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  small,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.secondary, small && styles.secondarySm, pressed && { opacity: 0.8 }]}
    >
      {icon ? <Ionicons name={icon} size={small ? 14 : 16} color={colors.text} /> : null}
      <Text style={[styles.secondaryText, small && { fontSize: 13 }]}>{label}</Text>
    </Pressable>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <Ionicons name="checkmark-circle" size={18} color={colors.blueBright} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: { color: colors.text, fontWeight: '900', letterSpacing: -1.5 },
  logoPaw: {
    textShadowColor: colors.blueGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 31,
  },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 6 },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: colors.muted,
    fontWeight: '800',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotDone: { backgroundColor: 'rgba(122,168,255,0.7)' },
  dotActive: { width: 20, backgroundColor: colors.white },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.pill,
  },
  pillSm: { minHeight: 38, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 19, gap: 6 },
  pillLg: { minHeight: 56, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 28, gap: 10 },
  pillOn: { backgroundColor: colors.white, borderColor: colors.white },
  pillText: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  pillTextOn: { color: colors.black, fontWeight: '700' },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primary: {
    minHeight: 54,
    borderRadius: radii.pill,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  primaryDisabled: { backgroundColor: 'rgba(255,255,255,0.08)' },
  whiteGlow: {
    shadowColor: colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  blueGlow: {
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  primaryText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.pill,
  },
  secondarySm: { minHeight: 36, paddingHorizontal: 13 },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  toast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111a33',
    borderWidth: 1,
    borderColor: colors.blueBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  toastText: { color: colors.text, fontWeight: '700', fontSize: 14 },
});
