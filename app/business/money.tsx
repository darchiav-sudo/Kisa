import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmSheet } from '@/src/components/Sheet';
import { Card, PrimaryButton, Toast, tap, useFlash } from '@/src/components/ui';
import { deleteMoney, formatMoney, moneyEntries, restoreMoney, updateMoney } from '@/src/lib/business';
import type { MoneyEntry } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

/** Every sale and expense, so a wrong amount or a double entry can be fixed. */
export default function MoneyScreen() {
  const business = useAppStore((s) => s.business);
  const [entries, setEntries] = useState<MoneyEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, flash] = useFlash();
  const businessId = business?.id;

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      setEntries(await moneyEntries(businessId));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!business) return null;
  const cur = business.money.currency;

  const remove = (entry: MoneyEntry) =>
    confirmSheet({
      title: `Delete ${formatMoney(entry.amount, cur)}?`,
      message: entry.label || (entry.kind === 'income' ? 'Earning' : 'Expense'),
      action: 'Delete',
      icon: 'trash',
      destructive: true,
      onConfirm: async () => {
        try {
          const deleted = await deleteMoney(business.id, entry.id);
          setEditing(null);
          await load();
          flash('Deleted', () =>
            void restoreMoney(business.id, deleted)
              .then(load)
              .catch((e) => flash((e as Error).message)),
          );
        } catch (e) {
          flash((e as Error).message);
        }
      },
    });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled={Platform.OS === 'android'}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={colors.blueBright}
            />
          }
        >
          <View style={styles.totals}>
            <Total label="earned" value={formatMoney(business.money.earned, cur)} color={colors.gold} />
            <Total label="spent" value={formatMoney(business.money.spent, cur)} />
            <Total label="profit" value={formatMoney(business.money.earned - business.money.spent, cur)} />
          </View>
          <Text style={styles.hint}>Tap an entry to fix the amount or delete it.</Text>

          {entries === null && !error ? (
            <ActivityIndicator color={colors.blueBright} style={{ marginTop: 30 }} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
          ) : entries!.length === 0 ? (
            <Text style={styles.empty}>Nothing yet. Sales you mark on orders and money from check-ins show up here.</Text>
          ) : (
            <View style={{ gap: 8, marginTop: 14 }}>
              {entries!.map((e) =>
                editing === e.id ? (
                  <EditEntry
                    key={e.id}
                    entry={e}
                    currency={cur}
                    onCancel={() => setEditing(null)}
                    onDelete={() => remove(e)}
                    onSave={async (patch) => {
                      try {
                        await updateMoney(business.id, e.id, patch);
                      } catch (err) {
                        flash((err as Error).message);
                        return;
                      }
                      tap('success');
                      setEditing(null);
                      await load();
                      flash('Saved', () =>
                        void updateMoney(business.id, e.id, { kind: e.kind, amount: e.amount, label: e.label })
                          .then(load)
                          .catch((err) => flash((err as Error).message)),
                      );
                    }}
                  />
                ) : (
                  <Pressable
                    key={e.id}
                    onPress={() => {
                      tap();
                      setEditing(e.id);
                    }}
                    style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                  >
                    <Card style={styles.row}>
                      <Ionicons
                        name={e.kind === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
                        size={22}
                        color={e.kind === 'income' ? colors.gold : colors.mutedSoft}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label} numberOfLines={1}>
                          {e.label || (e.kind === 'income' ? 'Earning' : 'Expense')}
                        </Text>
                        <Text style={styles.date}>{new Date(e.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.amount, e.kind === 'income' && { color: colors.gold }]}>
                        {e.kind === 'income' ? '+' : '−'}
                        {formatMoney(e.amount, cur)}
                      </Text>
                    </Card>
                  </Pressable>
                ),
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast?.message ?? null} undo={toast?.undo} />
    </SafeAreaView>
  );
}

function EditEntry({
  entry,
  currency,
  onSave,
  onCancel,
  onDelete,
}: {
  entry: MoneyEntry;
  currency: 'GEL' | 'USD';
  onSave: (patch: { kind: MoneyEntry['kind']; amount: number; label: string }) => Promise<void>;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [kind, setKind] = useState(entry.kind);
  const [amount, setAmount] = useState(String(entry.amount));
  const [label, setLabel] = useState(entry.label);
  const [saving, setSaving] = useState(false);
  const value = Number(amount.replace(',', '.'));

  return (
    <Card active>
      <View style={styles.kindRow}>
        {(['income', 'expense'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => setKind(k)}
            style={[styles.kindBtn, kind === k && styles.kindBtnOn]}
            accessibilityState={{ selected: kind === k }}
          >
            <Text style={[styles.kindText, kind === k && { color: colors.black }]}>
              {k === 'income' ? 'Earned' : 'Spent'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.currency}>{currency === 'GEL' ? '₾' : '$'}</Text>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^\d.,]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.amountInput}
          autoFocus
        />
      </View>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="What was it for?"
        placeholderTextColor={colors.faint}
        style={styles.labelInput}
        maxLength={200}
      />
      <PrimaryButton
        icon="checkmark"
        label="Save"
        loading={saving}
        disabled={!(value > 0)}
        onPress={async () => {
          setSaving(true);
          try {
            await onSave({ kind, amount: value, label: label.trim() });
          } finally {
            setSaving(false);
          }
        }}
      />
      <View style={styles.editFooter}>
        <Pressable onPress={onDelete} hitSlop={8} style={styles.footerBtn}>
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
          <Text style={[styles.footerText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
        <Pressable onPress={onCancel} hitSlop={8} style={styles.footerBtn}>
          <Text style={styles.footerText}>Cancel</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function Total({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={styles.total}>
      <Text style={[styles.totalValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  totals: { flexDirection: 'row', gap: 8 },
  total: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  totalValue: { color: colors.text, fontSize: 18, fontWeight: '800' },
  totalLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 12 },
  empty: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 24, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  date: { color: colors.muted, fontSize: 12, marginTop: 2 },
  amount: { color: colors.text, fontSize: 16, fontWeight: '800' },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.pill,
  },
  kindBtnOn: { backgroundColor: colors.white, borderColor: colors.white },
  kindText: { color: colors.mutedSoft, fontSize: 13, fontWeight: '800' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  currency: { color: colors.gold, fontSize: 22, fontWeight: '800' },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  labelInput: {
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 12,
  },
  editFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  footerText: { color: colors.mutedSoft, fontSize: 14, fontWeight: '700' },
});
