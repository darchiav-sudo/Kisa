import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmSheet } from '@/src/components/Sheet';
import { Backdrop, Card, IconName, Logo, tap } from '@/src/components/ui';
import { deleteAccount, signOutRemote } from '@/src/lib/auth';
import { listBusinesses, listSavedIdeas } from '@/src/lib/business';
import { forgetDevice } from '@/src/lib/notifications';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

function ask(title: string, message: string, action: string, onYes: () => void | Promise<void>) {
  confirmSheet({ title, message, action, destructive: true, onConfirm: onYes });
}

export default function ProfileScreen() {
  const user = useAppStore((s) => s.user);
  const intake = useAppStore((s) => s.intake);
  const signOut = useAppStore((s) => s.signOut);
  const [counts, setCounts] = useState<{ businesses: number; sales: number; ideas: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listBusinesses(), listSavedIdeas()])
        .then(([b, i]) =>
          setCounts({
            businesses: b.length,
            sales: b.reduce((n, x) => n + x.sales, 0),
            ideas: i.length,
          }),
        )
        .catch(() => undefined);
    }, []),
  );

  if (!user) return null;
  const initials = user.displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const chips = intake
    ? [intake.location, intake.budget, ...intake.skills, ...intake.assets, ...intake.languages].filter(Boolean)
    : [];

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.top}>
            <View style={styles.avatarRing}>
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}
            </View>
            <Text style={styles.name}>{user.displayName}</Text>
            {user.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>

          <View style={styles.stats}>
            <Stat value={counts?.businesses} label="businesses" />
            <Stat value={counts?.sales} label="sales" />
            <Stat value={counts?.ideas} label="saved ideas" />
          </View>

          <Text style={styles.section}>About you</Text>
          <Card>
            {chips.length ? (
              <View style={styles.chips}>
                {chips.slice(0, 14).map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>Kisa doesn’t know you yet.</Text>
            )}
            <Pressable onPress={() => router.push('/onboarding')} style={styles.edit}>
              <Ionicons name="create-outline" size={16} color={colors.blueBright} />
              <Text style={styles.editText}>{chips.length ? 'Edit my answers' : 'Answer a few questions'}</Text>
            </Pressable>
          </Card>

          <Text style={styles.section}>Account</Text>
          <Card style={{ padding: 0 }}>
            <Row icon="location-outline" label="Location access" onPress={() => Linking.openSettings()} />
            <Row
              icon="log-out-outline"
              label="Sign out"
              onPress={() =>
                ask('Sign out?', 'Your businesses stay saved in your account.', 'Sign out', async () => {
                  await forgetDevice();
                  await signOutRemote();
                  signOut();
                })
              }
            />
            <Row
              icon="trash-outline"
              label="Delete account"
              danger
              last
              onPress={() =>
                ask(
                  'Delete your account?',
                  'This permanently deletes your account, businesses, websites and saved ideas.',
                  'Delete',
                  async () => {
                    await forgetDevice();
                    await deleteAccount();
                    signOut();
                  },
                )
              }
            />
          </Card>

          <View style={styles.footer}>
            <Logo size={22} />
            <Text style={styles.version}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '–'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.mutedSoft} />
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const AVATAR = 88;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 130 },
  top: { alignItems: 'center', marginTop: 16 },
  avatarRing: {
    padding: 3,
    borderRadius: AVATAR,
    borderWidth: 2,
    borderColor: colors.blue,
    shadowColor: colors.blue,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarFallback: { backgroundColor: '#14204a', alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.white, fontSize: 30, fontWeight: '800' },
  name: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 14, letterSpacing: -0.4 },
  email: { color: colors.muted, fontSize: 14, marginTop: 3 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 22 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  section: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginTop: 26,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: { color: colors.mutedSoft, fontSize: 12, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 14 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  editText: { color: colors.blueBright, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  footer: { alignItems: 'center', marginTop: 30, gap: 6, opacity: 0.6 },
  version: { color: colors.muted, fontSize: 12 },
});
