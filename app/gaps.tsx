import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { timeAgo } from '@/src/components/home/AgentCard';
import { KisaLoader } from '@/src/components/KisaLoader';
import { Backdrop, Card, IconName, PrimaryButton, Toast, tap } from '@/src/components/ui';
import { gapToIdea, huntGaps } from '@/src/lib/business';
import type { Gap, GapKind } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

const KIND: Record<GapKind, { label: string; icon: IconName; color: string }> = {
  unanswered: { label: 'Nobody answers', icon: 'help-buoy', color: colors.cyan },
  complaints: { label: 'Fixes a complaint', icon: 'thumbs-down', color: colors.pink },
  missing: { label: 'Missing nearby', icon: 'location', color: colors.violet },
  language: { label: 'Language gap', icon: 'language', color: colors.blueBright },
  timing: { label: 'Right timing', icon: 'time', color: colors.amber },
  import: { label: 'Works elsewhere', icon: 'airplane', color: colors.gold },
};

const LINES = [
  'Reading local groups and forums…',
  'Finding questions nobody answered…',
  'Reading complaints in reviews…',
  'Checking what’s missing nearby…',
  'Checking upcoming events and seasons…',
  'Keeping only gaps with real proof…',
];

export default function GapsScreen() {
  const intake = useAppStore((s) => s.intake);
  const setPendingIdea = useAppStore((s) => s.setPendingIdea);
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [huntedAt, setHuntedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const hunt = useCallback(
    async (refresh = false) => {
      if (!intake) return;
      setGaps(null);
      setError(null);
      try {
        const res = await huntGaps(intake, refresh);
        tap('success');
        setGaps(res.gaps);
        setHuntedAt(res.huntedAt);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [intake],
  );

  useEffect(() => {
    if (!intake) router.replace('/onboarding');
    else void hunt();
  }, [intake, hunt]);

  const test = async (gap: Gap) => {
    if (!intake || testing) return;
    setTesting(gap.title);
    try {
      const idea = await gapToIdea(intake, gap);
      setPendingIdea(idea);
      router.push('/building');
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(null), 2000);
    } finally {
      setTesting(null);
    }
  };

  const stale = huntedAt ? Date.now() - new Date(huntedAt).getTime() > 86_400_000 : false;

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
          <Text style={styles.kicker}>HIDDEN OPPORTUNITIES</Text>
          <View style={styles.headerBtn} />
        </View>

        {error ? (
          <View style={styles.center}>
            <Ionicons name="telescope-outline" size={44} color={colors.white} />
            <Text style={styles.errorTitle}>The hunt came back empty</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
              <PrimaryButton label="Try again" onPress={() => hunt()} />
            </View>
          </View>
        ) : !gaps ? (
          <View style={styles.center}>
            <KisaLoader
              title={`Hunting in ${intake?.location.split(',')[0] ?? 'your city'}`}
              lines={LINES}
              expectedMs={45000}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.title}>{gaps.length} gaps Kisa found</Text>
            <Text style={styles.sub}>
              Real demand nobody serves well in {intake?.location.split(',')[0]}. Every one comes with proof.
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{huntedAt ? `Checked ${timeAgo(huntedAt)}` : ''}</Text>
              {stale ? (
                <Pressable onPress={() => hunt(true)} hitSlop={8}>
                  <Text style={styles.refresh}>Hunt again</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.how}>
              <Ionicons name="flask" size={16} color={colors.cyan} />
              <Text style={styles.howText}>
                Testing is free: Kisa builds a page with an order form in minutes. You share it. Orders within 48 hours
                mean the demand is real.
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              {gaps.map((g) => (
                <GapCard key={g.title} gap={g} busy={testing === g.title} disabled={!!testing} onTest={() => test(g)} />
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
      <Toast message={toast} />
    </View>
  );
}

function Dots({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.dots}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.dot, i <= value && { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function GapCard({ gap, busy, disabled, onTest }: { gap: Gap; busy: boolean; disabled: boolean; onTest: () => void }) {
  const [proof, setProof] = useState(false);
  const kind = KIND[gap.kind] ?? KIND.missing;
  return (
    <Card>
      <View style={styles.cardHead}>
        <Text style={{ fontSize: 30 }}>{gap.emoji}</Text>
        <View style={{ flex: 1 }}>
          <View style={[styles.kind, { borderColor: kind.color }]}>
            <Ionicons name={kind.icon} size={11} color={kind.color} />
            <Text style={[styles.kindText, { color: kind.color }]}>{kind.label}</Text>
          </View>
          <Text style={styles.gapTitle}>{gap.title}</Text>
        </View>
      </View>

      <Text style={styles.missing}>{gap.missing}</Text>
      <Text style={styles.oneLiner}>{gap.oneLiner}</Text>

      <View style={styles.meters}>
        <View style={styles.meter}>
          <Text style={styles.meterLabel}>Demand</Text>
          <Dots value={gap.demand} color={colors.gold} />
        </View>
        <View style={styles.meter}>
          <Text style={styles.meterLabel}>Competition</Text>
          <Text style={[styles.meterValue, { color: gap.competition <= 2 ? colors.cyan : gap.competition >= 4 ? colors.pink : colors.text }]}>
            {gap.competition <= 2 ? 'Low' : gap.competition >= 4 ? 'High' : 'Some'}
          </Text>
        </View>
        <View style={styles.meter}>
          <Text style={styles.meterLabel}>Fits you</Text>
          <Dots value={gap.fit} color={colors.blueBright} />
        </View>
      </View>
      {gap.whyYou ? <Text style={styles.whyYou}>{gap.whyYou}</Text> : null}

      <View style={styles.facts}>
        <Fact icon="cash-outline" text={gap.firstMoney} />
        <Fact icon="wallet-outline" text={gap.startCost} />
        <Fact icon="timer-outline" text={gap.speed} />
      </View>

      <Pressable onPress={() => setProof((v) => !v)} style={styles.proofToggle} hitSlop={6}>
        <Ionicons name="document-text-outline" size={15} color={colors.mutedSoft} />
        <Text style={styles.proofToggleText}>Proof ({gap.evidence.length})</Text>
        <Ionicons name={proof ? 'chevron-up' : 'chevron-down'} size={15} color={colors.mutedSoft} />
      </Pressable>
      {proof
        ? gap.evidence.map((e, i) => (
            <Pressable key={i} disabled={!e.url} onPress={() => e.url && Linking.openURL(e.url)} style={styles.evidence}>
              <Text style={styles.evTitle}>{e.title}</Text>
              <Text style={styles.evDetail}>{e.detail}</Text>
              {e.source || e.url ? (
                <Text style={styles.evSource} numberOfLines={1}>
                  {e.source ?? ''}
                  {e.url ? ' · open ↗' : ''}
                </Text>
              ) : null}
            </Pressable>
          ))
        : null}

      <Pressable
        onPress={onTest}
        disabled={disabled}
        style={({ pressed }) => [styles.testBtn, (pressed || (disabled && !busy)) && { opacity: 0.6 }]}
      >
        {busy ? <ActivityIndicator color={colors.black} /> : <Ionicons name="flask" size={16} color={colors.black} />}
        <Text style={styles.testText}>{busy ? 'Preparing the test…' : 'Test it in 48 hours'}</Text>
      </Pressable>
    </Card>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <Text style={styles.factText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerBtn: { width: 32, height: 32, justifyContent: 'center' },
  kicker: { color: colors.muted, fontWeight: '800', letterSpacing: 1.3, fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  errorText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  body: { padding: 16, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { color: colors.faint, fontSize: 12 },
  refresh: { color: colors.blueBright, fontSize: 13, fontWeight: '700' },
  how: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  howText: { flex: 1, color: colors.mutedSoft, fontSize: 13, lineHeight: 19 },
  cardHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  kind: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindText: { fontSize: 11, fontWeight: '800' },
  gapTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5, letterSpacing: -0.2 },
  missing: { color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 12 },
  oneLiner: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  meters: { flexDirection: 'row', marginTop: 14, gap: 8 },
  meter: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', gap: 6 },
  meterLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  meterValue: { fontSize: 14, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  whyYou: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, marginTop: 10, fontStyle: 'italic' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  factText: { color: colors.mutedSoft, fontSize: 12, flexShrink: 1 },
  proofToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  proofToggleText: { color: colors.mutedSoft, fontSize: 13, fontWeight: '700' },
  evidence: { marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.lineStrong },
  evTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  evDetail: { color: colors.mutedSoft, fontSize: 13, lineHeight: 18, marginTop: 2 },
  evSource: { color: colors.blueBright, fontSize: 12, marginTop: 3 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  testText: { color: colors.black, fontSize: 15, fontWeight: '800' },
});
