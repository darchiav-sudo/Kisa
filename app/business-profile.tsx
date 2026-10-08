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
import { services } from '@/src/services';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, radii, spacing } from '@/src/theme/colors';

const goals = ['First 5–10 sales fast', 'Max sales this week'];

export default function BusinessProfileScreen() {
  const setBusinessProfile = useAppStore((s) => s.setBusinessProfile);
  const existing = useAppStore((s) => s.businessProfile);

  const [product, setProduct] = useState(existing?.product ?? 'Books');
  const [location, setLocation] = useState(existing?.location ?? 'Tbilisi, Georgia');
  const [adBudget, setAdBudget] = useState(existing?.adBudget ?? '0 GEL');
  const [hasAudience, setHasAudience] = useState(existing?.hasAudience ?? true);
  const [remoteOk, setRemoteOk] = useState(existing?.remoteOk ?? true);
  const [goal, setGoal] = useState(existing?.goal ?? goals[0]);

  const onContinue = () => {
    const profile = {
      product: product.trim() || 'Books',
      location: location.trim() || 'Tbilisi, Georgia',
      adBudget,
      hasAudience,
      remoteOk,
      goal,
    };
    setBusinessProfile(profile);
    services.analytics.track('business_profile_saved', {
      product: profile.product,
      hasAudience,
      remoteOk,
    });
    router.push('/analysis');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Kicker tone="blue">Mode B · sell what you have</Kicker>
        <Title>Your business</Title>
        <Sub>Don’t invent a new business. Find the shortest path to cash for your product.</Sub>

        <Card style={{ marginTop: spacing.lg }}>
          <Field label="What are we selling?">
            <TextInput value={product} onChangeText={setProduct} style={styles.input} placeholderTextColor={colors.muted} />
          </Field>
          <Field label="Where is the inventory?">
            <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholderTextColor={colors.muted} />
          </Field>
          <Field label="Ad budget">
            <TextInput value={adBudget} onChangeText={setAdBudget} style={styles.input} placeholderTextColor={colors.muted} />
          </Field>

          <Text style={styles.label}>Own audience?</Text>
          <View style={styles.row}>
            <Chip active={hasAudience} label="Yes" onPress={() => setHasAudience(true)} />
            <Chip active={!hasAudience} label="No" onPress={() => setHasAudience(false)} />
          </View>

          <Text style={styles.label}>Can sell remotely?</Text>
          <View style={styles.row}>
            <Chip active={remoteOk} label="Yes — online" onPress={() => setRemoteOk(true)} />
            <Chip active={!remoteOk} label="Local only" onPress={() => setRemoteOk(false)} />
          </View>

          <Text style={styles.label}>Goal</Text>
          <View style={styles.row}>
            {goals.map((g) => (
              <Chip key={g} active={goal === g} label={g} onPress={() => setGoal(g)} />
            ))}
          </View>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton label="Find fastest sales paths" onPress={onContinue} />
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
