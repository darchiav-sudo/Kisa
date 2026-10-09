import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TodayTasks } from '@/src/components/home/TodayTasks';
import { Badge, confirmSheet, showSheet } from '@/src/components/Sheet';
import {
  Backdrop,
  Logo,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  Toast,
  useFlash,
  type Flash,
} from '@/src/components/ui';
import { archiveBusiness, refreshBusiness } from '@/src/lib/business';
import { findIdeaNow } from '@/src/lib/nav';
import { syncNotifications } from '@/src/lib/notifications';
import type { Business } from '@/src/models/types';
import { useAppStore, useUpdates } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

const STAGE = {
  launch: { label: 'Getting first customer', icon: 'rocket', color: colors.muted },
  first_sales: { label: 'First sales', icon: 'cash', color: colors.muted },
  grow: { label: 'Growing', icon: 'trending-up', color: colors.muted },
} as const;

export default function HomeScreen() {
  const business = useAppStore((s) => s.business);
  const intake = useAppStore((s) => s.intake);
  const pendingIdea = useAppStore((s) => s.pendingIdea);
  const [loaded, setLoaded] = useState(!!business);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, flash] = useFlash();
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
      <Toast message={toast?.message ?? null} undo={toast?.undo} />
    </View>
  );
}

function BusinessHome({ business, onFlash }: { business: Business; onFlash: Flash }) {
  const stage = STAGE[business.stage];
  const updates = useUpdates();

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{business.kit.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {business.kit.name}
          </Text>
          <View style={styles.stageRow}>
            <Ionicons name={stage.icon} size={11} color={stage.color} />
            <Text style={[styles.stage, { color: stage.color }]}>{stage.label}</Text>
          </View>
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => openMenu(business, updates)}
          style={styles.menuBtn}
          accessibilityLabel={updates.total ? `Menu, ${updates.total} new` : 'Menu'}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.white} />
          {updates.total ? <Badge count={updates.total} style={styles.menuBadge} /> : null}
        </Pressable>
      </View>

      {updates.total ? (
        <View style={styles.updates}>
          {updates.leads ? (
            <UpdatePill
              icon="bag-handle"
              label={`${updates.leads} new ${updates.leads === 1 ? 'order' : 'orders'}`}
              onPress={() => router.push('/business/customers')}
            />
          ) : null}
          {updates.activity ? (
            <UpdatePill
              icon="paw"
              label={`${updates.activity} new from Kisa`}
              onPress={() => router.push('/business/activity')}
            />
          ) : null}
        </View>
      ) : null}

      <SectionLabel>Today</SectionLabel>
      <TodayTasks business={business} onFlash={onFlash} />
    </>
  );
}

function UpdatePill({ icon, label, onPress }: { icon: 'bag-handle' | 'paw'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.updatePill, pressed && { opacity: 0.8 }]}>
      <View style={styles.updateDot} />
      <Ionicons name={icon} size={13} color={colors.white} />
      <Text style={styles.updateText}>{label}</Text>
      <Ionicons name="chevron-forward" size={13} color={colors.muted} />
    </Pressable>
  );
}

function openMenu(business: Business, updates: { leads: number; activity: number }) {
  showSheet({
    title: business.kit.name,
    message: business.kit.tagline,
    actions: [
      { label: 'Customers', icon: 'people-outline', badge: updates.leads, onPress: () => router.push('/business/customers') },
      { label: 'Kisa’s work', icon: 'paw-outline', badge: updates.activity, onPress: () => router.push('/business/activity') },
      { label: 'Money', icon: 'cash-outline', onPress: () => router.push('/business/money') },
      { label: 'Business kit', icon: 'briefcase-outline', onPress: () => router.push('/business/kit') },
      { label: 'Connections & payments', icon: 'link-outline', onPress: () => router.push('/business/connections') },
      { label: 'Open website', icon: 'globe-outline', onPress: () => Linking.openURL(business.siteUrl) },
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 130, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 8 },
  emptyTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 22, letterSpacing: -0.4 },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 21 },
  emptyActions: { alignSelf: 'stretch', gap: 10, marginTop: 30 },
  changeLink: { alignSelf: 'center', paddingVertical: 8 },
  changeLinkText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  headerEmoji: { fontSize: 24 },
  name: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  stage: { fontSize: 11, fontWeight: '700' },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  menuBadge: { position: 'absolute', top: -6, right: -6 },
  updates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  updatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  updateDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blueBright },
  updateText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});
