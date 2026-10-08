import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/src/theme/colors';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}

export function Kicker({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' | 'gold' }) {
  const color = tone === 'blue' ? colors.blue : tone === 'gold' ? colors.gold : colors.green;
  return <Text style={[styles.kicker, { color }]}>{children}</Text>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Sub({ children }: { children: ReactNode }) {
  return <Text style={styles.sub}>{children}</Text>;
}

export function Card({
  children,
  done,
  style,
}: {
  children: ReactNode;
  done?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, done && styles.cardDone, style]}>{children}</View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && { opacity: 0.9, transform: [{ scale: 0.985 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryBtnText} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  tone = 'default',
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'good' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        tone === 'good' && styles.goodBtn,
        tone === 'ghost' && styles.ghostBtn,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text
        style={[
          styles.secondaryBtnText,
          tone === 'good' && { color: '#caffdc' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total <= 0 ? 0 : Math.min(100, Math.round((value / total) * 100));
  return (
    <View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {value} of {total} steps ready
      </Text>
    </View>
  );
}

export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function Tag({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'good' | 'gold';
}) {
  return (
    <View
      style={[
        styles.tag,
        tone === 'good' && styles.tagGood,
        tone === 'gold' && styles.tagGold,
      ]}
    >
      <Text
        style={[
          styles.tagText,
          tone === 'good' && { color: '#c9ffda' },
          tone === 'gold' && { color: '#ffe6a7' },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <View style={styles.warning}>
      <Text style={styles.warningText}>{children}</Text>
    </View>
  );
}

export function ScriptBox({ text }: { text: string }) {
  return (
    <View style={styles.script}>
      <Text style={styles.scriptText}>{text}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#10151c',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pillText: {
    color: '#c6d2df',
    fontSize: 12,
    fontWeight: '700',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
    lineHeight: 34,
    marginTop: 8,
  },
  sub: {
    color: '#c0cad6',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  cardDone: {
    backgroundColor: colors.cardDone,
    borderColor: '#34734d',
  },
  primaryBtn: {
    backgroundColor: colors.primaryBtn,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.primaryBtnText,
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#354253',
    backgroundColor: '#202a39',
    borderRadius: radii.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  goodBtn: {
    backgroundColor: colors.greenDim,
    borderColor: colors.greenBorder,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  progressTrack: {
    height: 9,
    backgroundColor: '#090d11',
    borderWidth: 1,
    borderColor: '#222a34',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
  },
  metric: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#0c1116',
    borderRadius: 13,
    alignItems: 'center',
  },
  metricValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  tag: {
    borderWidth: 1,
    borderColor: '#303c4b',
    backgroundColor: '#10161d',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tagGood: {
    borderColor: '#356346',
    backgroundColor: '#102018',
  },
  tagGold: {
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldDim,
  },
  tagText: {
    color: '#c4cfdb',
    fontSize: 11,
    fontWeight: '700',
  },
  warning: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  warningText: {
    color: colors.warningText,
    fontSize: 12,
    lineHeight: 18,
  },
  script: {
    marginTop: 10,
    backgroundColor: '#090e14',
    borderWidth: 1,
    borderColor: '#242f3c',
    borderRadius: 12,
    padding: 11,
  },
  scriptText: {
    color: '#dfe7f0',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 9,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#aeb9c8',
    fontWeight: '900',
  },
});
