import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmSheet, showSheet } from '@/src/components/Sheet';
import { Card, IconName, PrimaryButton, SecondaryButton, SectionLabel, Toast, tap, useFlash } from '@/src/components/ui';
import {
  addMoney,
  deleteSentMessage,
  draftFollowUp,
  draftLeadReply,
  leadMessages,
  paymentText,
  sendReply,
  setLeadStatus,
} from '@/src/lib/business';
import type { Lead, LeadMessage, LeadStatus } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

type ContactAction = { label: string; icon: IconName; color: string; open: (text: string | null) => string; prefills: boolean };

/** WhatsApp and SMS open with Kisa's text already in the message box; Telegram can't prefill, so it gets copied. */
function contactActions(contact: string): ContactAction[] {
  const digits = contact.replace(/[^\d+]/g, '');
  const actions: ContactAction[] = [];
  if (/^\+?\d{7,}$/.test(digits)) {
    const wa = digits.replace('+', '');
    actions.push({
      label: 'WhatsApp',
      icon: 'logo-whatsapp',
      color: '#25D366',
      prefills: true,
      open: (text) => `https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ''}`,
    });
    actions.push({
      label: 'Message',
      icon: 'chatbubble',
      color: colors.blueBright,
      prefills: true,
      open: (text) =>
        `sms:${digits}${text ? `${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}` : ''}`,
    });
    actions.push({ label: 'Call', icon: 'call', color: colors.white, prefills: false, open: () => `tel:${digits}` });
  }
  const tg = contact.match(/@([A-Za-z0-9_]{4,})/);
  if (tg) {
    actions.push({
      label: 'Telegram',
      icon: 'paper-plane',
      color: '#2AABEE',
      prefills: false,
      open: () => `https://t.me/${tg[1]}`,
    });
  }
  const email = contact.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (email && !tg) {
    actions.push({
      label: 'Email',
      icon: 'mail',
      color: colors.amber,
      prefills: true,
      open: (text) => `mailto:${email[0]}${text ? `?body=${encodeURIComponent(text)}` : ''}`,
    });
  }
  return actions;
}

const STATUS_ACTIONS: { status: LeadStatus; label: string; icon: IconName; color: string }[] = [
  { status: 'replied', label: 'Replied', icon: 'chatbubble', color: colors.blueBright },
  { status: 'won', label: 'Sale', icon: 'trophy', color: colors.gold },
  { status: 'lost', label: 'Lost', icon: 'close-circle', color: colors.pink },
];

export default function LeadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const lead = business?.leads.find((l) => l.id === id);
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [toast, flash] = useFlash();
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [paid, setPaid] = useState(false);
  const [thread, setThread] = useState<LeadMessage[]>([]);
  const [sending, setSending] = useState(false);

  const viaTelegram = lead?.channel === 'telegram';
  const payment = business?.connections?.payment;
  const followingUp = lead?.status === 'replied' && !!lead.followUp;

  useEffect(() => {
    if (!business || !lead || !viaTelegram) return;
    leadMessages(business.id, lead.id).then(setThread).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, lead?.status, viaTelegram]);

  const loadDraft = (fresh: boolean) => {
    if (!business || !lead) return;
    setDrafting(true);
    const request = followingUp && fresh ? draftFollowUp(business.id, lead.id) : draftLeadReply(business.id, lead.id, fresh);
    request
      .then(setDraft)
      .catch(() => setDraft(null))
      .finally(() => setDrafting(false));
  };

  useEffect(() => {
    if (followingUp) setDraft(lead!.followUp!);
    else loadDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, followingUp]);

  if (!business || !lead) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 16, gap: 16 }}>
          <Text style={styles.name}>Order not found</Text>
          <SecondaryButton label="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const actions = viaTelegram ? [] : contactActions(lead.contact);

  const sendOnTelegram = async () => {
    if (!draft) return;
    setSending(true);
    try {
      await sendReply(business.id, lead.id, draft);
      tap('success');
      flash('Sent on Telegram');
      setDraft(null);
      setThread(await leadMessages(business.id, lead.id));
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const messageMenu = (m: LeadMessage) => {
    tap();
    showSheet({
      title: m.direction === 'out' ? 'Your message' : `${lead.name}’s message`,
      message: m.text.length > 140 ? `${m.text.slice(0, 140)}…` : m.text,
      actions: [
        {
          label: 'Copy text',
          icon: 'copy-outline',
          onPress: async () => {
            await Clipboard.setStringAsync(m.text);
            flash('Copied');
          },
        },
        ...(m.canDelete
          ? [
              {
                label: `Delete for ${lead.name} too`,
                icon: 'trash-outline' as IconName,
                destructive: true,
                onPress: () =>
                  confirmSheet({
                    title: 'Delete this message?',
                    message: `It disappears from ${lead.name}’s Telegram as well. This can’t be undone.`,
                    action: 'Delete',
                    icon: 'trash',
                    destructive: true,
                    onConfirm: async () => {
                      try {
                        await deleteSentMessage(business.id, lead.id, m.id);
                        setThread(await leadMessages(business.id, lead.id));
                        flash('Message deleted');
                      } catch (e) {
                        flash((e as Error).message);
                      }
                    },
                  }),
              },
            ]
          : []),
      ],
    });
  };

  const contact = async (a: ContactAction) => {
    tap();
    if (draft && !a.prefills && a.label !== 'Call') {
      await Clipboard.setStringAsync(draft);
      flash('Reply copied — paste it');
    }
    await Linking.openURL(a.open(draft)).catch(() => flash(`Couldn’t open ${a.label}`));
    if (a.label !== 'Call' && lead.status === 'new') void setLeadStatus(business.id, lead.id, 'replied');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled={Platform.OS === 'android'}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.name}>{lead.name}</Text>
          <Text style={styles.contact}>{lead.contact}</Text>
          <Text style={styles.date}>
            {new Date(lead.createdAt).toLocaleString()} · {viaTelegram ? 'on Telegram' : 'from your website'}
          </Text>

          {viaTelegram && thread.length ? (
            <View style={styles.thread}>
              {thread.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => messageMenu(m)}
                  style={({ pressed }) => [
                    styles.bubble,
                    m.direction === 'out' ? styles.bubbleOut : styles.bubbleIn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.bubbleText}>{m.text}</Text>
                </Pressable>
              ))}
              {thread.some((m) => m.canDelete) ? (
                <Text style={styles.threadHint}>Sent something wrong? Tap your message to delete it for {lead.name}.</Text>
              ) : null}
            </View>
          ) : lead.message ? (
            <Card style={{ marginTop: 16 }}>
              <Text style={styles.messageText}>{lead.message}</Text>
            </Card>
          ) : null}

          <SectionLabel>{followingUp ? 'Follow-up Kisa wrote' : 'Kisa’s reply for you'}</SectionLabel>
          <Card active style={styles.draftCard}>
            <View style={styles.draftTools}>
              {payment && draft !== null && !drafting ? (
                <Pressable
                  hitSlop={8}
                  style={styles.toolBtn}
                  accessibilityLabel="Add payment details"
                  onPress={() => {
                    tap();
                    const pay = paymentText(payment);
                    if (!draft.includes(pay)) setDraft(`${draft.trimEnd()}\n\n${pay}`);
                  }}
                >
                  <Ionicons name="cash-outline" size={15} color={colors.gold} />
                </Pressable>
              ) : null}
              {draft && !drafting ? (
                <Pressable
                  hitSlop={8}
                  style={styles.toolBtn}
                  accessibilityLabel="Copy reply"
                  onPress={async () => {
                    await Clipboard.setStringAsync(draft);
                    tap();
                    flash('Copied');
                  }}
                >
                  <Ionicons name="copy-outline" size={15} color={colors.white} />
                </Pressable>
              ) : null}
              <Pressable
                hitSlop={8}
                style={styles.toolBtn}
                disabled={drafting}
                accessibilityLabel="Write another"
                onPress={() => {
                  tap();
                  loadDraft(true);
                }}
              >
                <Ionicons name="refresh" size={15} color={colors.white} />
              </Pressable>
            </View>
            {drafting ? (
              <ActivityIndicator color={colors.blueBright} style={{ marginVertical: 18 }} />
            ) : draft !== null ? (
              <TextInput value={draft} onChangeText={setDraft} multiline style={styles.draftText} />
            ) : (
              <Text style={styles.draftText}>
                {viaTelegram && thread.at(-1)?.direction === 'out'
                  ? 'Sent. Kisa will have the next reply ready when they answer.'
                  : 'Could not draft a reply. Tap ↻ to try again, or use the reply scripts in your kit.'}
              </Text>
            )}
          </Card>

          {viaTelegram ? (
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                icon="paper-plane"
                label="Send on Telegram"
                loading={sending}
                disabled={!draft?.trim()}
                onPress={sendOnTelegram}
              />
            </View>
          ) : null}

          {actions.length ? (
            <View style={styles.row}>
              {actions.slice(0, 4).map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => contact(a)}
                  style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                  accessibilityLabel={a.label}
                >
                  <Ionicons name={a.icon} size={18} color={a.color} />
                  <Text style={styles.contactText}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {actions.some((a) => a.prefills) ? (
            <Text style={styles.hint}>WhatsApp and Message open with Kisa’s text already typed — just hit send.</Text>
          ) : null}

          <SectionLabel>How did it go?</SectionLabel>
          <View style={styles.row}>
            {STATUS_ACTIONS.map((a) => {
              const on = lead.status === a.status;
              return (
                <Pressable
                  key={a.status}
                  onPress={() => {
                    tap(a.status === 'won' ? 'success' : 'light');
                    const before = lead.status;
                    const next = on ? 'new' : a.status;
                    void setLeadStatus(business.id, lead.id, next)
                      .then(() =>
                        flash(on ? `No longer “${a.label}”` : `Marked as ${a.label.toLowerCase()}`, () =>
                          void setLeadStatus(business.id, lead.id, before).catch(() => undefined),
                        ),
                      )
                      .catch((e) => flash((e as Error).message));
                  }}
                  style={[styles.statusBtn, on && { borderColor: a.color, backgroundColor: `${a.color}22` }]}
                  accessibilityState={{ selected: on }}
                >
                  <Ionicons name={a.icon} size={15} color={a.color} />
                  <Text style={[styles.statusText, on && { color: colors.white }]}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {lead.status === 'won' ? (
            <PaidCard
              lead={lead}
              currency={business.money.currency}
              paid={paid}
              amount={amount}
              setAmount={setAmount}
              saving={saving}
              onSave={async () => {
                setSaving(true);
                try {
                  await addMoney(business.id, {
                    kind: 'income',
                    amount: Number(amount.replace(',', '.')),
                    label: `Order · ${lead.name}`,
                  });
                  tap('success');
                  setPaid(true);
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast?.message ?? null} undo={toast?.undo} />
    </SafeAreaView>
  );
}

function PaidCard({
  lead,
  currency,
  paid,
  amount,
  setAmount,
  saving,
  onSave,
}: {
  lead: Lead;
  currency: 'GEL' | 'USD';
  paid: boolean;
  amount: string;
  setAmount: (v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  if (paid) {
    return (
      <View style={styles.paidDone}>
        <Ionicons name="checkmark-circle" size={15} color={colors.gold} />
        <Text style={styles.paidDoneText}>Added to your earnings. Nice work!</Text>
        <Pressable onPress={() => router.push('/business/money')} hitSlop={8}>
          <Text style={styles.paidFix}>Wrong amount?</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <Card style={{ marginTop: 14 }}>
      <Text style={styles.paidTitle}>How much did {lead.name} pay?</Text>
      <View style={styles.paidRow}>
        <Text style={styles.currency}>{currency === 'GEL' ? '₾' : '$'}</Text>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^\d.,]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.faint}
          style={styles.amountInput}
        />
      </View>
      <PrimaryButton
        icon="cash"
        label="Add to my earnings"
        loading={saving}
        disabled={!(Number(amount.replace(',', '.')) > 0)}
        onPress={onSave}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  name: { color: colors.text, fontSize: 26, fontWeight: '800' },
  contact: { color: colors.blueBright, fontSize: 16, fontWeight: '700', marginTop: 4 },
  date: { color: colors.muted, fontSize: 12, marginTop: 4 },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  draftCard: { minHeight: 80, paddingTop: 14 },
  draftTools: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6, zIndex: 1 },
  toolBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  draftText: { color: colors.text, fontSize: 15, lineHeight: 22, paddingRight: 108, padding: 0, textAlignVertical: 'top' },
  thread: { marginTop: 16, gap: 6 },
  bubble: { maxWidth: '85%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16 },
  bubbleIn: { alignSelf: 'flex-start', backgroundColor: colors.pill, borderBottomLeftRadius: 4 },
  bubbleOut: { alignSelf: 'flex-end', backgroundColor: 'rgba(42,171,238,0.25)', borderBottomRightRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  threadHint: { color: colors.faint, fontSize: 11, textAlign: 'right', marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contactBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  contactText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  statusText: { color: colors.mutedSoft, fontSize: 13, fontWeight: '700' },
  paidDone: { flexDirection: 'row', gap: 8, marginTop: 14 },
  paidDoneText: { color: colors.gold, fontSize: 13, lineHeight: 19, flex: 1 },
  paidFix: { color: colors.mutedSoft, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  paidTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  currency: { color: colors.gold, fontSize: 24, fontWeight: '800' },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
