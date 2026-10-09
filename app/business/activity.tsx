import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AgentCard } from '@/src/components/home/AgentCard';
import { Toast, useFlash } from '@/src/components/ui';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

export default function ActivityScreen() {
  const business = useAppStore((s) => s.business);
  const markSeen = useAppStore((s) => s.markActivitySeen);
  const [toast, flash] = useFlash();
  const businessId = business?.id;

  // Seen on open and again on leave, so events that arrive while reading don't stay "new".
  useFocusEffect(
    useCallback(() => {
      if (!businessId) return;
      markSeen(businessId);
      return () => markSeen(businessId);
    }, [businessId, markSeen]),
  );

  if (!business) return null;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <AgentCard business={business} onFlash={flash} limit={20} />
      </ScrollView>
      <Toast message={toast?.message ?? null} undo={toast?.undo} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
});
