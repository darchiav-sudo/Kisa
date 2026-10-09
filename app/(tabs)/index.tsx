import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Backdrop,
  Card,
  IconName,
  Logo,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  Toast,
  tap,
} from '@/src/components/ui';
import { confirmSheet, showSheet } from '@/src/components/Sheet';
import { archiveBusiness, formatMoney, refreshBusiness, setTaskStatus } from '@/src/lib/business';
import { findIdeaNow } from '@/src/lib/nav';
import { syncNotifications } from '@/src/lib/notifications';
import type { Business, Task } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

const STAGE = {
  launch: { label: 'Getting first customer', icon: 'rocket', color: colors.blueBright },
  first_sales: { label: 'First sales', icon: 'cash', color: colors.gold },
  grow: { label: 'Growing', icon: 'trending-up', color: colors.cyan },
} as const;

const KIND: Record<Task['kind'], { icon: IconName; color: string }> = {
  setup: { icon: 'settings', color: colors.violet },
  post: { icon: 'megaphone', color: colors.pink },
  message: { icon: 'chatbubbles', color: colors.cyan },
  do: { icon: 'checkmark-done', color: colors.blueBright },
  buy: { icon: 'cart', color: colors.amber },
  learn: { icon: 'bulb', color: colors.orange },
};

export default function HomeScreen() {
  const business = useAppStore((s) => s.business);
  const intake = useAppStore((s) => s.intake);
  const pendingIdea = useAppStore((s) => s.pendingIdea);
  const [loaded, setLoaded] = useState(!!business);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const refresh = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const fresh = await refreshBusiness();
      setError(null);
      const s = useAppStore.getState();
      if (!fresh && !s.intake && !s.pendingIdea && !autoStarted.current) {
        // First visit: go straight into the questions, no extra tap.
        autoStarted.current = true;
        router.push('/onboarding');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const taskKey = business?.tasks
    .filter((t) => t.status === 'todo')
    .map((t) => t.id)
    .join(',');
  useEffect(() => {
    if (!loaded) return;
    void syncNotifications(business);
    // Only when the business or today's tasks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, business?.id, taskKey]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  let content;
  if (business) {
    content = <BusinessHome business={business} onFlash={flash} />;
  } else if (!loaded) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blueBright} />
      </View>
    );
  } else if (error) {
    content = (
      <View style={styles.center}>
        <Ionicons name="cloud-offline" size={42} color={colors.blueBright} />
        <Text style={styles.emptyTitle}>Can’t reach Kisa right now</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <View style={{ alignSelf: 'stretch', marginTop: 22 }}>
          <PrimaryButton label="Try again" onPress={() => refresh()} />
        </View>
      </View>
    );
  } else {
    content = (
      <View style={styles.empty}>
        <Logo size={44} />
        <Text style={styles.emptyTitle}>Start something small</Text>
        <Text style={styles.emptyText}>Kisa looks at your area and finds an easy business to start. Free, no strings.</Text>
        <View style={styles.emptyActions}>
          {pendingIdea ? (
            <PrimaryButton
              icon="hammer"
              label={`Finish building “${pendingIdea.title}”`}
              onPress={() => router.push('/building')}
            />
          ) : null}
          <PrimaryButton
            icon="search"
            label="Find me a business"
            onPress={() => (intake ? findIdeaNow('hands-on') : router.push('/onboarding'))}
          />
          <SecondaryButton
            icon="flash-outline"
            label="Find one Kisa can run for me"
            onPress={() =>
              intake
                ? findIdeaNow('hands-off')
                : router.push({ pathname: '/onboarding', params: { mode: 'hands-off' } })
            }
          />
          {intake ? (
            <Pressable onPress={() => router.push('/onboarding')} style={styles.changeLink} hitSlop={8}>
              <Text style={styles.changeLinkText}>Change my answers</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={colors.blueBright} />
          }
        >
          {content}
        </ScrollView>
      </SafeAreaView>
      <Toast message={toast} />
    </View>
  );
}

function BusinessHome({ business, onFlash }: { business: Business; onFlash: (m: string) => void }) {
  const todo = business.tasks.filter((t) => t.status === 'todo');
  const recentDone = business.tasks.filter((t) => t.status === 'done').slice(0, 3);
  const newLeads = business.leads.filter((l) => l.status === 'new').length;
  const stage = STAGE[business.stage];
  const cur = business.money.currency;

  return (
    <>
      <View style={styles.header}>
        <View style={styles.bizEmoji}>
          <Text style={{ fontSize: 28 }}>{business.kit.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {business.kit.name}
          </Text>
          <View style={styles.stageRow}>
            <Ionicons name={stage.icon} size={13} color={stage.color} />
            <Text style={[styles.stage, { color: stage.color }]}>{stage.label}</Text>
          </View>
        </View>
        <Pressable hitSlop={10} onPress={() => openMenu(business)} style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.stats}>
        <Stat value={formatMoney(business.money.earned, cur)} label="earned" color={colors.gold} />
        <Stat value={String(business.visits?.week ?? 0)} label="visits · 7 days" />
        <Stat value={String(business.leads.length)} label="orders" />
      </View>

      {business.coach ? (
        <Card active style={{ marginTop: 14 }}>
          <View style={styles.coachHead}>
            <Ionicons name="paw" size={14} color={colors.blueBright} />
            <Text style={styles.coachLabel}>KISA SAYS</Text>
          </View>
          <Text style={styles.coachText}>{business.coach}</Text>
        </Card>
      ) : null}

      <SectionLabel>Today</SectionLabel>
      {todo.length === 0 ? (
        <Card>
          <Text style={styles.allDoneTitle}>All done for now 🎉</Text>
          <Text style={styles.allDoneText}>Tell Kisa what happened and get your next steps.</Text>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {todo.map((t) => (
            <TaskCard key={t.id} task={t} business={business} onFlash={onFlash} />
          ))}
        </View>
      )}
      {recentDone.map((t) => (
        <DoneRow key={t.id} task={t} business={business} />
      ))}

      <View style={{ marginTop: 16 }}>
        <PrimaryButton
          icon="chatbubble-ellipses"
          label="Daily check-in"
          onPress={() => router.push('/business/checkin')}
        />
      </View>

      <SectionLabel>
        Orders{newLeads > 0 ? ` · ${newLeads} new` : ''}
      </SectionLabel>
      {business.leads.length === 0 ? (
        <Text style={styles.muted}>When someone orders on your website, it shows up here. Kisa drafts your reply.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {business.leads.slice(0, 5).map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/business/lead/${l.id}`)}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <Card style={styles.lead}>
                {l.status === 'new' ? <View style={styles.newDot} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName}>{l.name}</Text>
                  <Text style={styles.leadMsg} numberOfLines={1}>
                    {l.message || l.contact}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <SectionLabel>Your website</SectionLabel>
      <Card>
        <Text style={styles.siteUrl} numberOfLines={1}>
          {business.siteUrl.replace(/^https?:\/\//, '')}
        </Text>
        <Text style={styles.visitLine}>
          {business.visits?.total
            ? `${business.visits.today} today · ${business.visits.week} this week · ${business.visits.total} total visits`
            : 'No visits yet — share the link and Kisa will count real visitors.'}
        </Text>
        <View style={styles.siteActions}>
          <SecondaryButton
            small
            icon="copy-outline"
            label="Copy"
            onPress={async () => {
              await Clipboard.setStringAsync(business.siteUrl);
              onFlash('Link copied');
            }}
          />
          <SecondaryButton small icon="open-outline" label="Open" onPress={() => Linking.openURL(business.siteUrl)} />
          <SecondaryButton
            small
            icon="share-outline"
            label="Share"
            onPress={() => Share.share({ message: `${business.kit.name} — ${business.kit.tagline}\n${business.siteUrl}` })}
          />
        </View>
      </Card>

      <Pressable onPress={() => router.push('/business/kit')} style={({ pressed }) => [{ marginTop: 12 }, pressed && { opacity: 0.85 }]}>
        <Card style={styles.kitRow}>
          <View style={styles.kitIcon}>
            <Ionicons name="briefcase" size={20} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kitTitle}>Your business kit</Text>
            <Text style={styles.kitText}>Offer, posts, reply scripts, shopping list</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Card>
      </Pressable>
    </>
  );
}

function openMenu(business: Business) {
  showSheet({
    title: business.kit.name,
    message: business.kit.tagline,
    actions: [
      { label: 'Open website', icon: 'globe-outline', onPress: () => Linking.openURL(business.siteUrl) },
      { label: 'Business kit', icon: 'briefcase-outline', onPress: () => router.push('/business/kit') },
      {
        label: 'Pause this business',
        icon: 'pause-circle-outline',
        destructive: true,
        onPress: () =>
          confirmSheet({
            title: 'Pause it?',
            message: 'It moves to Saved. You can bring it back any time.',
            action: 'Pause',
            icon: 'pause',
            destructive: true,
            onConfirm: async () => {
              await archiveBusiness(business.id);
              router.navigate('/new');
            },
          }),
      },
    ],
  });
}

/** Share links that already carry the message, so there is nothing to paste. */
function embedsText(url: string) {
  return /^(sms:|mailto:)|wa\.me\/.*text=|t\.me\/share|api\.whatsapp\.com\/send|facebook\.com\/sharer/i.test(url);
}

function DoneRow({ task, business }: { task: Task; business: Business }) {
  const [busy, setBusy] = useState(false);
  return (
    <View style={[styles.doneRow, busy && { opacity: 0.5 }]}>
      <Ionicons name="checkmark-circle" size={16} color={colors.mutedSoft} />
      <Text style={styles.doneLine} numberOfLines={1}>
        {task.title}
      </Text>
      <Pressable
        hitSlop={10}
        disabled={busy}
        onPress={async () => {
          tap();
          setBusy(true);
          try {
            await setTaskStatus(business.id, task.id, 'todo');
          } finally {
            setBusy(false);
          }
        }}
        style={styles.undo}
        accessibilityLabel={`Undo ${task.title}`}
      >
        <Ionicons name="arrow-undo" size={13} color={colors.white} />
        <Text style={styles.undoText}>Undo</Text>
      </Pressable>
    </View>
  );
}

function TaskCard({ task, business, onFlash }: { task: Task; business: Business; onFlash: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const kind = KIND[task.kind] ?? KIND.do;

  const update = async (status: 'done' | 'skipped') => {
    setBusy(true);
    try {
      await setTaskStatus(business.id, task.id, status);
      if (status === 'done') {
        tap('success');
        onFlash('Nice! Done');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={busy ? { opacity: 0.6 } : undefined}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.taskIcon, { borderColor: kind.color }]}>
          <Ionicons name={kind.icon} size={16} color={kind.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskWhy}>{task.why}</Text>
        </View>
      </View>
      {task.copyText ? (
        <Text style={styles.copyPreview} numberOfLines={3}>
          {task.copyText}
        </Text>
      ) : null}
      <View style={styles.taskActions}>
        {task.url ? (
          <SecondaryButton
            small
            icon={task.copyText && !embedsText(task.url) ? 'copy-outline' : 'open-outline'}
            label={
              task.copyText && !embedsText(task.url)
                ? `Copy & ${task.linkLabel ? task.linkLabel.toLowerCase() : 'open'}`
                : task.linkLabel || 'Open'
            }
            onPress={async () => {
              if (task.copyText && !embedsText(task.url!)) {
                await Clipboard.setStringAsync(task.copyText);
                onFlash('Text copied — paste it');
              }
              await Linking.openURL(task.url!).catch(() => onFlash('Could not open that link'));
            }}
          />
        ) : null}
        {task.copyText ? (
          <SecondaryButton
            small
            icon="copy-outline"
            label={task.url ? 'Copy' : 'Copy text'}
            onPress={async () => {
              await Clipboard.setStringAsync(task.copyText!);
              onFlash('Copied');
            }}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => update('skipped')} disabled={busy} hitSlop={8}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
        <Pressable
          onPress={() => update('done')}
          disabled={busy}
          style={({ pressed }) => [styles.doneBtn, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Ionicons name="checkmark" size={16} color={colors.black} />
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 130, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 8 },
  emptyTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 22, letterSpacing: -0.4 },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  emptyActions: { alignSelf: 'stretch', gap: 10, marginTop: 30 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  bizEmoji: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  stage: { fontSize: 13, fontWeight: '700' },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  statValue: { color: colors.text, fontSize: 19, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  coachHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coachLabel: { color: colors.blueBright, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  coachText: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 6 },
  allDoneTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  allDoneText: { color: colors.muted, fontSize: 14, marginTop: 4 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 4 },
  doneLine: { color: colors.muted, fontSize: 13, textDecorationLine: 'line-through', flex: 1 },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  undoText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  changeLink: { alignSelf: 'center', paddingVertical: 8 },
  changeLinkText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  taskTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  taskWhy: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, marginTop: 3 },
  copyPreview: {
    marginTop: 12,
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 10,
  },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  skip: { color: colors.muted, fontSize: 13, fontWeight: '700', paddingHorizontal: 6 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  doneBtnText: { color: colors.black, fontWeight: '800', fontSize: 14 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  lead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blueBright },
  leadName: { color: colors.text, fontWeight: '800', fontSize: 15 },
  leadMsg: { color: colors.muted, fontSize: 13, marginTop: 2 },
  siteUrl: { color: colors.blueBright, fontWeight: '700', fontSize: 14 },
  siteActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  visitLine: { color: colors.muted, fontSize: 12, marginTop: 6 },
  kitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,191,36,0.12)',
  },
  kitTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  kitText: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
