import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IdeaCard } from '@/src/components/IdeaCard';
import { KisaLoader } from '@/src/components/KisaLoader';
import { Backdrop, PrimaryButton, SecondaryButton, Toast, tap } from '@/src/components/ui';
import { findIdea, saveIdea, type IdeaMode } from '@/src/lib/business';
import type { Idea } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

const SEARCH_LINES = [
  'Looking around your area…',
  'Checking what people pay for…',
  'Matching it to your skills…',
  'Finding where customers are…',
  'Checking real prices…',
  'Picking the easiest one to start…',
];

const HANDS_OFF_LINES = [
  'Looking for things Kisa can do for you…',
  'Checking what people pay for online…',
  'Keeping your part tiny…',
  'Checking real prices…',
];

/** Height of the floating tab bar above the safe-area inset. */
const TAB_BAR = 78;

export default function IdeaScreen() {
  const params = useLocalSearchParams<{ run?: string; mode?: string }>();
  const mode: IdeaMode = params.mode === 'hands-off' ? 'hands-off' : 'hands-on';
  const insets = useSafeAreaInsets();
  const intake = useAppStore((s) => s.intake);
  const setPendingIdea = useAppStore((s) => s.setPendingIdea);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const reveal = useRef(new Animated.Value(0)).current;
  const searchId = useRef(0);

  const search = useCallback(
    async (exclude: string[]) => {
      if (!intake) return;
      const id = ++searchId.current;
      setIdea(null);
      setError(null);
      reveal.setValue(0);
      try {
        const found = await findIdea(intake, exclude, mode);
        if (id !== searchId.current) return;
        tap('success');
        setIdea(found);
        Animated.spring(reveal, { toValue: 1, friction: 8, useNativeDriver: Platform.OS !== 'web' }).start();
      } catch (e) {
        if (id === searchId.current) setError((e as Error).message || 'Something went wrong.');
      }
    },
    [intake, reveal, mode],
  );

  // This screen stays mounted inside the tabs, so every new `run` starts a fresh search.
  useEffect(() => {
    if (!intake) {
      router.push('/onboarding');
      return;
    }
    setRejected([]);
    void search([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.run, mode]);

  const onSave = async () => {
    if (!idea || !intake || savedTitle === idea.title) return;
    setSaving(true);
    try {
      await saveIdea(intake, idea);
      setSavedTitle(idea.title);
      setToast('Saved to your ideas');
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast((e as Error).message || 'Could not save');
      setTimeout(() => setToast(null), 1800);
    } finally {
      setSaving(false);
    }
  };

  const bottomSpace = TAB_BAR + Math.max(insets.bottom, 12);

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.navigate('/new')}
            hitSlop={12}
            accessibilityLabel="Back"
            style={styles.headerBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
          {idea ? (
            <Text style={styles.kicker}>{idea.handsOff ? 'KISA CAN RUN THIS' : 'AN IDEA FOR YOU'}</Text>
          ) : (
            <View />
          )}
          <View style={styles.headerBtn} />
        </View>

        {error ? (
          <View style={[styles.center, { paddingBottom: bottomSpace }]}>
            <Ionicons name="cloud-offline-outline" size={44} color={colors.white} />
            <Text style={styles.errorTitle}>Couldn’t finish the search</Text>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorActions}>
              <PrimaryButton label="Try again" onPress={() => search(rejected)} />
              <SecondaryButton label="Change my answers" onPress={() => router.push('/onboarding')} />
            </View>
          </View>
        ) : !idea ? (
          <View style={[styles.center, { paddingBottom: bottomSpace }]}>
            <KisaLoader
              title={mode === 'hands-off' ? 'Finding one Kisa can run' : 'Finding an easy start'}
              lines={[
                ...(mode === 'hands-off' ? HANDS_OFF_LINES : SEARCH_LINES),
                `Researching ${intake?.location ?? 'your area'} live…`,
              ]}
              expectedMs={rejected.length % 3 === 0 ? 20000 : 4000}
            />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.body}>
              <Animated.View
                style={{
                  opacity: reveal,
                  transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
                }}
              >
                <IdeaCard idea={idea} />
              </Animated.View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: bottomSpace + 6 }]}>
              <PrimaryButton
                label="Start this business"
                chevron
                onPress={() => {
                  setPendingIdea(idea);
                  router.push('/building');
                }}
              />
              <View style={styles.row}>
                <Pressable
                  onPress={onSave}
                  disabled={saving}
                  accessibilityLabel={savedTitle === idea.title ? 'Saved' : 'Save'}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons
                    name={savedTitle === idea.title ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={colors.white}
                  />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SecondaryButton
                    icon="refresh"
                    label="Another idea"
                    onPress={() => {
                      const next = [...rejected, idea.title];
                      setRejected(next);
                      void search(next);
                    }}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
      <Toast message={toast} />
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
    paddingTop: 6,
    paddingBottom: 6,
  },
  headerBtn: { width: 32, height: 32, justifyContent: 'center' },
  kicker: { color: colors.muted, fontWeight: '800', letterSpacing: 1.3, fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  errorText: { color: colors.muted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  errorActions: { alignSelf: 'stretch', gap: 10, marginTop: 26 },
  body: { padding: 16, paddingBottom: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
});
