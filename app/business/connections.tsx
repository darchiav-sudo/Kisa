import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmSheet } from '@/src/components/Sheet';
import { Card, PrimaryButton, SecondaryButton, SectionLabel, Toast, tap } from '@/src/components/ui';
import { disconnectTelegramChannel, refreshBusiness, telegramLinkCode, updateSettings } from '@/src/lib/business';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

const TG = '#2AABEE';

export default function ConnectionsScreen() {
  const business = useAppStore((s) => s.business);
  const conn = business?.connections;
  const [toast, setToast] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [link, setLink] = useState(conn?.payment?.link ?? '');
  const [details, setDetails] = useState(conn?.payment?.details ?? '');
  const [savingPay, setSavingPay] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };

  // While waiting for the code to show up in the channel, keep checking.
  useEffect(() => {
    if (!code || conn?.telegramChannel) return;
    const timer = setInterval(() => void refreshBusiness().catch(() => undefined), 4000);
    return () => clearInterval(timer);
  }, [code, conn?.telegramChannel]);

  if (!business || !conn) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.blueBright} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const bot = conn.telegramBot;
  const customerLink = bot ? `https://t.me/${bot}?start=b_${business.slug}` : null;
  const payChanged = link !== (conn.payment?.link ?? '') || details !== (conn.payment?.details ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" enabled={Platform.OS === 'android'}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.lead}>
            Connect the places where your customers are. Kisa works there for you — you approve, or let it run.
          </Text>

          <SectionLabel>Telegram</SectionLabel>
          <Card>
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: `${TG}22` }]}>
                <Ionicons name="paper-plane" size={18} color={TG} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Customers chat with Kisa</Text>
                <Text style={styles.text}>
                  {bot
                    ? `Your website has a Telegram button. Customers write to @${bot}, Kisa writes the reply, you send it with one tap.`
                    : 'Switching on soon — the Kisa bot isn’t connected on the server yet.'}
                </Text>
              </View>
            </View>
            {customerLink ? (
              <>
                <Pressable
                  style={styles.linkRow}
                  onPress={async () => {
                    await Clipboard.setStringAsync(customerLink);
                    tap();
                    flash('Link copied — share it with customers');
                  }}
                >
                  <Text style={styles.linkText} numberOfLines={1}>
                    {customerLink.replace('https://', '')}
                  </Text>
                  <Ionicons name="copy-outline" size={15} color={colors.white} />
                </Pressable>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Kisa answers by itself</Text>
                    <Text style={styles.text}>Off: Kisa drafts, you send. On: Kisa replies instantly and tells you.</Text>
                  </View>
                  <Switch
                    value={conn.autoReply}
                    onValueChange={(v) => {
                      tap();
                      void updateSettings(business.id, { autoReply: v }).catch((e) => flash((e as Error).message));
                    }}
                    trackColor={{ true: TG, false: colors.line }}
                  />
                </View>
              </>
            ) : null}
          </Card>

          {bot ? (
            <Card style={{ marginTop: 10 }}>
              <View style={styles.head}>
                <View style={[styles.icon, { backgroundColor: `${TG}22` }]}>
                  <Ionicons name="megaphone" size={18} color={TG} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Your Telegram channel</Text>
                  <Text style={styles.text}>
                    {conn.telegramChannel
                      ? `Connected: “${conn.telegramChannel.title}”. Posts from Today get a “Post to my channel” button.`
                      : 'Kisa posts your offers there with one tap.'}
                  </Text>
                </View>
              </View>
              {conn.telegramChannel ? (
                <SecondaryButton
                  small
                  icon="unlink"
                  label="Disconnect"
                  onPress={() =>
                    confirmSheet({
                      title: `Disconnect “${conn.telegramChannel!.title}”?`,
                      message: 'Kisa stops posting there. To connect it again you’ll need a new code.',
                      action: 'Disconnect',
                      icon: 'unlink',
                      destructive: true,
                      onConfirm: () =>
                        disconnectTelegramChannel(business.id)
                          .then(() => flash('Channel disconnected'))
                          .catch((e) => flash((e as Error).message)),
                    })
                  }
                />
              ) : code ? (
                <View style={styles.steps}>
                  <Step n={1} text={`Open your channel → Administrators → add @${bot}`} />
                  <Step n={2} text="Post this code in the channel (Kisa deletes it right away):" />
                  <Pressable
                    style={styles.codeBox}
                    onPress={async () => {
                      await Clipboard.setStringAsync(code);
                      tap();
                      flash('Code copied');
                    }}
                  >
                    <Text style={styles.code}>{code}</Text>
                    <Ionicons name="copy-outline" size={16} color={colors.white} />
                  </Pressable>
                  <View style={styles.waiting}>
                    <ActivityIndicator size="small" color={TG} />
                    <Text style={styles.text}>Waiting for the code…</Text>
                  </View>
                  <SecondaryButton small icon="open-outline" label="Open Telegram" onPress={() => Linking.openURL('tg://')} />
                </View>
              ) : (
                <SecondaryButton
                  small
                  icon="link"
                  label="Connect my channel"
                  onPress={async () => {
                    try {
                      setCode((await telegramLinkCode(business.id)).code);
                    } catch (e) {
                      flash((e as Error).message);
                    }
                  }}
                />
              )}
            </Card>
          ) : null}

          <SectionLabel>Getting paid</SectionLabel>
          <Card>
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: 'rgba(255,211,109,0.14)' }]}>
                <Ionicons name="cash" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>How customers pay you</Text>
                <Text style={styles.text}>
                  Kisa adds this to replies when a customer is ready to pay. Use any link you already have (PayPal.me,
                  Revolut, Stripe, bank pay link) and/or transfer details.
                </Text>
              </View>
            </View>
            <Text style={styles.label}>Payment link</Text>
            <TextInput
              value={link}
              onChangeText={setLink}
              placeholder="https://paypal.me/yourname"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={styles.input}
            />
            <Text style={styles.label}>Or transfer details</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Bank, IBAN, name — or “cash on delivery”"
              placeholderTextColor={colors.faint}
              multiline
              style={[styles.input, { minHeight: 64 }]}
            />
            {payChanged ? (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  label="Save"
                  loading={savingPay}
                  onPress={async () => {
                    setSavingPay(true);
                    try {
                      await updateSettings(business.id, {
                        payment: link.trim() || details.trim() ? { link: link.trim(), details: details.trim() } : null,
                      });
                      tap('success');
                      flash('Saved');
                    } catch (e) {
                      flash((e as Error).message);
                    } finally {
                      setSavingPay(false);
                    }
                  }}
                />
              </View>
            ) : null}
          </Card>

          <SectionLabel>Coming next</SectionLabel>
          <Card>
            <View style={styles.head}>
              <View style={[styles.icon, { backgroundColor: colors.pill }]}>
                <Ionicons name="mail" size={18} color={colors.mutedSoft} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Business email</Text>
                <Text style={styles.text}>
                  Your own address where Kisa reads and answers customer emails. Needs Kisa’s own domain first.
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast} />
    </SafeAreaView>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepN}>
        <Text style={styles.stepNText}>{n}</Text>
      </View>
      <Text style={[styles.text, { flex: 1, marginTop: 0 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  lead: { color: colors.mutedSoft, fontSize: 15, lineHeight: 21 },
  head: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  text: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  linkText: { flex: 1, color: TG, fontSize: 14, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  switchTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  steps: { gap: 10 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepN: { width: 22, height: 22, borderRadius: 11, backgroundColor: TG, alignItems: 'center', justifyContent: 'center' },
  stepNText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TG,
    backgroundColor: 'rgba(42,171,238,0.1)',
  },
  code: { color: colors.white, fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: {
    color: colors.text,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
