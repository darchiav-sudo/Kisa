import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IdeaCard } from '@/src/components/IdeaCard';
import { Backdrop, PrimaryButton, SecondaryButton } from '@/src/components/ui';
import { deleteSavedIdea, listSavedIdeas } from '@/src/lib/business';
import type { SavedIdea } from '@/src/models/types';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

export default function SavedIdeaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const setIntake = useAppStore((s) => s.setIntake);
  const setPendingIdea = useAppStore((s) => s.setPendingIdea);
  const [saved, setSaved] = useState<SavedIdea | null | undefined>(undefined);

  useEffect(() => {
    listSavedIdeas()
      .then((list) => setSaved(list.find((i) => i.id === id) ?? null))
      .catch(() => setSaved(null));
  }, [id]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/saved'));

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={close} hitSlop={12} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
          <Text style={styles.kicker}>SAVED IDEA</Text>
          <View style={{ width: 26 }} />
        </View>

        {saved === undefined ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.blueBright} />
          </View>
        ) : saved === null ? (
          <View style={styles.center}>
            <Text style={styles.muted}>This idea is gone.</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.body}>
              <IdeaCard idea={saved.idea} />
            </ScrollView>
            <View style={styles.footer}>
              <PrimaryButton
                tone="blue"
                icon="sparkles"
                label="Build this business for me"
                onPress={() => {
                  setIntake(saved.intake);
                  setPendingIdea(saved.idea);
                  router.replace('/building');
                }}
              />
              <SecondaryButton
                icon="trash-outline"
                label="Remove"
                onPress={async () => {
                  await deleteSavedIdea(saved.id).catch(() => undefined);
                  close();
                }}
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  kicker: { color: colors.blueBright, fontWeight: '800', letterSpacing: 1.3, fontSize: 11 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.muted, fontSize: 15 },
  body: { padding: 16, paddingBottom: 24 },
  footer: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
});
