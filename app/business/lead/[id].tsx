import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, IconName, OptionPill, PrimaryButton, SecondaryButton, SectionLabel, tap } from '@/src/components/ui';
import { draftLeadReply, setLeadStatus } from '@/src/lib/business';
import type { LeadStatus } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

function contactLinks(contact: string) {
  const digits = contact.replace(/[^\d+]/g, '');
  const links: { label: string; icon: IconName; url: string }[] = [];
  if (/^\+?\d{7,}$/.test(digits)) {
    links.push({ label: 'WhatsApp', icon: 'logo-whatsapp', url: `https://wa.me/${digits.replace('+', '')}` });
    links.push({ label: 'Call', icon: 'call', url: `tel:${digits}` });
  }
  const tg = contact.match(/@([A-Za-z0-9_]{4,})/);
  if (tg) links.push({ label: 'Telegram', icon: 'paper-plane', url: `https://t.me/${tg[1]}` });
  return links;
}

const STATUS_ACTIONS: { status: LeadStatus; label: string; icon: IconName; color: string }[] = [
  { status: 'replied', label: 'I replied', icon: 'chatbubble', color: colors.blueBright },
  { status: 'won', label: 'It’s a sale', icon: 'trophy', color: colors.gold },
  { status: 'lost', label: 'Didn’t work out', icon: 'close-circle', color: colors.pink },
];

export default function LeadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const lead = business?.leads.find((l) => l.id === id);
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadDraft = (fresh: boolean) => {
    if (!business || !lead) return;
    setDrafting(true);
    draftLeadReply(business.id, lead.id, fresh)
      .then(setDraft)
      .catch(() => setDraft(null))
      .finally(() => setDrafting(false));
  };

  useEffect(() => {
    loadDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

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

  const links = contactLinks(lead.contact);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.name}>{lead.name}</Text>
        <Text style={styles.contact}>{lead.contact}</Text>
        <Text style={styles.date}>{new Date(lead.createdAt).toLocaleString()}</Text>

        {lead.message ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.messageText}>{lead.message}</Text>
          </Card>
        ) : null}

        <SectionLabel>Kisa’s reply for you</SectionLabel>
        <Card active style={{ minHeight: 80, justifyContent: 'center' }}>
          {drafting ? (
            <ActivityIndicator color={colors.blueBright} />
          ) : (
            <Text style={styles.draftText}>
              {draft ?? 'Could not draft a reply. Use your reply scripts in the kit.'}
            </Text>
          )}
        </Card>

        <View style={{ gap: 10, marginTop: 14 }}>
          {draft ? (
            <PrimaryButton
              icon={copied ? 'checkmark' : 'copy-outline'}
              label={copied ? 'Copied' : 'Copy reply'}
              onPress={async () => {
                await Clipboard.setStringAsync(draft);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            />
          ) : null}
          {!drafting ? (
            <SecondaryButton small icon="refresh" label="Write another" onPress={() => loadDraft(true)} />
          ) : null}
          {links.length ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {links.map((l) => (
                <View key={l.label} style={{ flex: 1 }}>
                  <SecondaryButton icon={l.icon} label={l.label} onPress={() => Linking.openURL(l.url)} />
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <SectionLabel>How did it go?</SectionLabel>
        <View style={styles.chips}>
          {STATUS_ACTIONS.map((a) => (
            <OptionPill
              key={a.status}
              size="sm"
              icon={a.icon}
              iconColor={a.color}
              label={a.label}
              selected={lead.status === a.status}
              onPress={() => {
                if (a.status === 'won') tap('success');
                void setLeadStatus(business.id, lead.id, a.status);
              }}
            />
          ))}
        </View>
        {lead.status === 'won' ? (
          <View style={styles.hint}>
            <Ionicons name="cash" size={15} color={colors.gold} />
            <Text style={styles.hintText}>Got paid? Add it in your daily check-in so Kisa tracks your money.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
  name: { color: colors.text, fontSize: 26, fontWeight: '800' },
  contact: { color: colors.blueBright, fontSize: 16, fontWeight: '700', marginTop: 4 },
  date: { color: colors.muted, fontSize: 12, marginTop: 4 },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  draftText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hint: { flexDirection: 'row', gap: 8, marginTop: 14 },
  hintText: { color: colors.gold, fontSize: 13, lineHeight: 19, flex: 1 },
});
