import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CustomersCard, LeadList } from '@/src/components/home/Customers';
import { SectionLabel, Toast, useFlash } from '@/src/components/ui';
import { refreshBusiness } from '@/src/lib/business';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

export default function CustomersScreen() {
  const business = useAppStore((s) => s.business);
  const [toast, flash] = useFlash();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshBusiness().catch(() => undefined);
    }, []),
  );

  if (!business) return null;
  const newLeads = business.leads.filter((l) => l.status === 'new').length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshBusiness().catch(() => undefined);
              setRefreshing(false);
            }}
            tintColor={colors.blueBright}
          />
        }
      >
        <CustomersCard business={business} onFlash={flash} />
        {business.leads.length ? (
          <SectionLabel>Orders{newLeads ? ` · ${newLeads} new` : ''}</SectionLabel>
        ) : null}
        <LeadList business={business} />
      </ScrollView>
      <Toast message={toast?.message ?? null} undo={toast?.undo} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 40 },
});
