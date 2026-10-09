import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconName, OptionPill, PrimaryButton, tap } from '@/src/components/ui';
import { checkIn, formatMoney } from '@/src/lib/business';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, iconPalette } from '@/src/theme/colors';

const EVENTS: { icon: IconName; label: string }[] = [
  { icon: 'megaphone', label: 'I posted my offer' },
  { icon: 'chatbubbles', label: 'Got replies' },
  { icon: 'eye-off', label: 'No replies yet' },
  { icon: 'cart', label: 'Got an order' },
  { icon: 'cash', label: 'Got paid' },
  { icon: 'receipt', label: 'I spent money' },
  { icon: 'pricetag', label: 'Someone said too expensive' },
  { icon: 'star', label: 'Happy customer' },
  { icon: 'hourglass', label: 'Didn’t have time' },
  { icon: 'help-circle', label: 'I’m stuck' },
];

const PAID = 'Got paid';
const SPENT = 'I spent money';

export default function CheckinScreen() {
  const business = useAppStore((s) => s.business);
  const [events, setEvents] = useState<string[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [earned, setEarned] = useState('');
  const [spent, setSpent] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!business) return null;
  const price = business.kit.offer.price;
  const cur = business.money.currency;
  const known = new Set(EVENTS.map((e) => e.label));

  const toggle = (label: string) =>
    setEvents((e) => (e.includes(label) ? e.filter((x) => x !== label) : [...e, label]));

  const addCustom = () => {
    const v = custom.trim();
    if (v && !events.includes(v)) setEvents((e) => [...e, v]);
    setCustom('');
    setCustomOpen(false);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await checkIn(business.id, {
        events,
        earned: events.includes(PAID) ? Number(earned) || undefined : undefined,
        spent: events.includes(SPENT) ? Number(spent) || undefined : undefined,
        note: note.trim() || undefined,
      });
      tap('success');
      router.back();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled={Platform.OS === 'android'}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title}>What happened?</Text>
        <Text style={styles.subtitle}>Tap everything that’s true since last time.</Text>

        <View style={styles.chips}>
          {EVENTS.map((e, i) => (
            <OptionPill
              key={e.label}
              size="sm"
              icon={e.icon}
              iconColor={iconPalette[i % iconPalette.length]}
              label={e.label}
              selected={events.includes(e.label)}
              onPress={() => toggle(e.label)}
            />
          ))}
          {events
            .filter((e) => !known.has(e))
            .map((e) => (
              <OptionPill key={e} size="sm" icon="create" label={e} selected onPress={() => toggle(e)} />
            ))}
          {customOpen ? (
            <TextInput
              autoFocus
              value={custom}
              onChangeText={setCustom}
              onSubmitEditing={addCustom}
              onBlur={addCustom}
              placeholder="What else happened?"
              placeholderTextColor={colors.faint}
              style={[styles.input, styles.customInput]}
              returnKeyType="done"
            />
          ) : (
            <OptionPill
              size="sm"
              icon="add"
              iconColor={colors.white}
              label="Other"
              selected={false}
              onPress={() => setCustomOpen(true)}
            />
          )}
        </View>

        {events.includes(PAID) ? (
          <AmountPicker
            title="How much did you get paid?"
            quick={[price, price * 2, price * 3]}
            currency={cur}
            value={earned}
            onChange={setEarned}
          />
        ) : null}
        {events.includes(SPENT) ? (
          <AmountPicker
            title="How much did you spend?"
            quick={[10, 25, 50]}
            currency={cur}
            value={spent}
            onChange={setSpent}
          />
        ) : null}

        <Text style={styles.label}>Anything else? (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="e.g. a customer asked if I also do windows"
          placeholderTextColor={colors.faint}
          style={[styles.input, { minHeight: 80, textAlignVertical: 'top', borderRadius: 18 }]}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={busy ? 'Kisa is planning…' : 'Get my next steps'}
          onPress={submit}
          loading={busy}
          disabled={events.length === 0 && !note.trim()}
          chevron
        />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function AmountPicker({
  title,
  quick,
  currency,
  value,
  onChange,
}: {
  title: string;
  quick: number[];
  currency: 'GEL' | 'USD';
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={styles.label}>{title}</Text>
      <View style={styles.amounts}>
        {quick.map((q) => (
          <OptionPill
            key={q}
            label={formatMoney(q, currency)}
            selected={value === String(q)}
            onPress={() => onChange(String(q))}
          />
        ))}
        <TextInput
          value={quick.map(String).includes(value) ? '' : value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="Other"
          placeholderTextColor={colors.faint}
          style={[styles.input, { flex: 1, minWidth: 90 }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, paddingBottom: 32 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 6, marginBottom: 20, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  input: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  customInput: { minWidth: 200, borderColor: colors.blueBorder, paddingVertical: 8, borderRadius: 19 },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: 24,
    marginBottom: 10,
  },
  amounts: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  error: { color: colors.danger, marginTop: 14 },
  footer: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
});
