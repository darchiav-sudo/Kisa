import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, Kicker, PrimaryButton, Sub, Title } from '@/src/components/ui';
import type { ChannelPreference } from '@/src/models/types';
import { services } from '@/src/services';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii, spacing } from '@/src/theme/colors';

const times = ['1–2h', '2–3h', 'half day', 'full day'];
const channels: { id: ChannelPreference; label: string }[] = [
  { id: 'either', label: 'Either' },
  { id: 'online', label: 'Online' },
  { id: 'offline', label: 'Offline' },
];

export default function MoneyProfileScreen() {
  const setMoneyProfile = useAppStore((s) => s.setMoneyProfile);
  const existing = useAppStore((s) => s.moneyProfile);

  const [location, setLocation] = useState(existing?.location ?? 'Northeast Philadelphia');
  const [budget, setBudget] = useState(String(existing?.budgetUsd ?? 200));
  const [timeHours, setTimeHours] = useState(existing?.timeHours ?? '2–3h');
  const [hasCar, setHasCar] = useState(existing?.hasCar ?? true);
  const [channel, setChannel] = useState<ChannelPreference>(existing?.channel ?? 'either');

  const onContinue = () => {
    const profile = {
      location: location.trim() || 'Northeast Philadelphia',
      budgetUsd: Number(budget) || 200,
      timeHours,
      hasCar,
      channel,
    };
    setMoneyProfile(profile);
    services.analytics.track('money_profile_saved', {
      budget: profile.budgetUsd,
      hasCar,
      channel,
    });
    router.push('/analysis');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Kicker>Mode A · make money</Kicker>
        <Title>Money profile</Title>
        <Sub>Tell Kisa your constraints. We prepare launches — you approve.</Sub>

        <Card style={{ marginTop: spacing.lg }}>
          <Field label="Location">
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label="Budget (USD)">
            <TextInput
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>

          <Text style={styles.label}>Time available</Text>
          <View style={styles.row}>
            {times.map((t) => (
              <Chip key={t} active={timeHours === t} label={t} onPress={() => setTimeHours(t)} />
            ))}
          </View>

          <Text style={styles.label}>Car</Text>
          <View style={styles.row}>
            <Chip active={hasCar} label="Yes" onPress={() => setHasCar(true)} />
            <Chip active={!hasCar} label="No" onPress={() => setHasCar(false)} />
          </View>

          <Text style={styles.label}>Channel</Text>
          <View style={styles.row}>
            {channels.map((c) => (
              <Chip
                key={c.id}
                active={channel === c.id}
                label={c.label}
                onPress={() => setChannel(c.id)}
              />
            ))}
          </View>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton label="Analyze opportunities" onPress={onContinue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    backgroundColor: '#0d131a',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#111720',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.primaryBtn,
    borderColor: colors.primaryBtn,
  },
  chipText: { color: '#b8c3cf', fontWeight: '800', fontSize: 13 },
  chipTextActive: { color: colors.primaryBtnText },
});
