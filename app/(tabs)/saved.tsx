import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmSheet } from '@/src/components/Sheet';
import { Backdrop, Card, OptionPill, SecondaryButton, tap } from '@/src/components/ui';
import {
  activateBusiness,
  deleteSavedIdea,
  formatMoney,
  listBusinesses,
  listSavedIdeas,
} from '@/src/lib/business';
import type { BusinessSummary, SavedIdea } from '@/src/models/types';
import { colors } from '@/src/theme/colors';

type Tab = 'businesses' | 'ideas';

function confirm(title: string, message: string, action: string, onYes: () => void | Promise<void>) {
  confirmSheet({ title, message, action, destructive: action === 'Remove', onConfirm: onYes });
}

export default function SavedScreen() {
  const [tab, setTab] = useState<Tab>('businesses');
  const [businesses, setBusinesses] = useState<BusinessSummary[] | null>(null);
  const [ideas, setIdeas] = useState<SavedIdea[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const [b, i] = await Promise.all([listBusinesses(), listSavedIdeas()]);
      setBusinesses(b);
      setIdeas(i);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openBusiness = (b: BusinessSummary) => {
    if (b.status === 'active') {
      router.navigate('/');
      return;
    }
    confirm('Switch to this business?', `“${b.name}” becomes your active business.`, 'Switch', async () => {
      setBusyId(b.id);
      try {
        await activateBusiness(b.id);
        tap('success');
        router.navigate('/');
      } finally {
        setBusyId(null);
      }
    });
  };

  const removeIdea = (idea: SavedIdea) =>
    confirm('Remove this idea?', idea.idea.title, 'Remove', async () => {
      setIdeas((list) => list?.filter((x) => x.id !== idea.id) ?? null);
      await deleteSavedIdea(idea.id).catch(() => load());
    });

  const loading = businesses === null || ideas === null;

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.blueBright} />
          }
        >
          <Text style={styles.title}>Saved</Text>
          <View style={styles.segment}>
            <OptionPill
              size="sm"
              icon="briefcase"
              iconColor={tab === 'businesses' ? colors.blue : colors.blueBright}
              label={`Businesses${businesses ? ` · ${businesses.length}` : ''}`}
              selected={tab === 'businesses'}
              onPress={() => setTab('businesses')}
            />
            <OptionPill
              size="sm"
              icon="bulb"
              iconColor={colors.amber}
              label={`Ideas${ideas ? ` · ${ideas.length}` : ''}`}
              selected={tab === 'ideas'}
              onPress={() => setTab('ideas')}
            />
          </View>

          {error && loading ? (
            <View style={styles.center}>
              <Text style={styles.emptyText}>{error}</Text>
              <SecondaryButton label="Try again" onPress={() => load()} />
            </View>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.blueBright} />
            </View>
          ) : tab === 'businesses' ? (
            businesses!.length === 0 ? (
              <Empty
                icon="briefcase"
                text="No businesses yet. Tap + and Kisa will find you one."
                action="Find me a business"
                onPress={() => router.navigate('/new')}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {businesses!.map((b) => (
                  <Pressable key={b.id} onPress={() => openBusiness(b)} disabled={!!busyId}>
                    {({ pressed }) => (
                      <Card active={b.status === 'active'} style={[styles.row, pressed && { opacity: 0.85 }]}>
                        <View style={styles.emoji}>
                          <Text style={{ fontSize: 24 }}>{b.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {b.name}
                          </Text>
                          <Text style={styles.rowText} numberOfLines={1}>
                            {b.tagline}
                          </Text>
                          <View style={styles.metaRow}>
                            <View style={[styles.badge, b.status === 'active' && styles.badgeOn]}>
                              <Text style={[styles.badgeText, b.status === 'active' && { color: colors.white }]}>
                                {b.status === 'active' ? 'Active' : 'Paused'}
                              </Text>
                            </View>
                            <Text style={styles.meta}>
                              {formatMoney(b.earned, b.currency)} · {b.sales} sales
                            </Text>
                          </View>
                        </View>
                        {busyId === b.id ? (
                          <ActivityIndicator color={colors.blueBright} />
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                        )}
                      </Card>
                    )}
                  </Pressable>
                ))}
              </View>
            )
          ) : ideas!.length === 0 ? (
            <Empty
              icon="bookmark"
              text="Ideas you save show up here. Tap Save on any idea Kisa finds."
              action="Find an idea"
              onPress={() => router.navigate('/new')}
            />
          ) : (
            <View style={{ gap: 10 }}>
              {ideas!.map((i) => (
                <Pressable key={i.id} onPress={() => router.push(`/saved/${i.id}`)}>
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && { opacity: 0.85 }]}>
                      <View style={styles.emoji}>
                        <Text style={{ fontSize: 24 }}>{i.idea.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {i.idea.title}
                        </Text>
                        <Text style={styles.rowText} numberOfLines={2}>
                          {i.idea.oneLiner}
                        </Text>
                        <Text style={[styles.meta, { marginTop: 6 }]}>
                          {i.idea.firstMoney} · {i.intake.location}
                        </Text>
                      </View>
                      <Pressable hitSlop={10} onPress={() => removeIdea(i)}>
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    </Card>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Empty({
  icon,
  text,
  action,
  onPress,
}: {
  icon: 'briefcase' | 'bookmark';
  text: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.blueBright} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
      <SecondaryButton icon="add" label={action} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 130, flexGrow: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
  segment: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 18 },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16, paddingHorizontal: 20 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c1430',
    borderWidth: 1,
    borderColor: colors.blueBorder,
  },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  emoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  rowText: { color: colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeOn: { backgroundColor: colors.blue },
  badgeText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  meta: { color: colors.mutedSoft, fontSize: 12, fontWeight: '600' },
});
