import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LaunchCard } from '@/src/components/LaunchCard';
import { Card, Metric, Pill, SectionLabel, Sub, Warning } from '@/src/components/ui';
import { getLaunchesForMode } from '@/src/data/launches';
import { selectTotalEarnings, useAppStore } from '@/src/store/useAppStore';
import { colors, spacing } from '@/src/theme/colors';

export default function LaunchesScreen() {
  const mode = useAppStore((s) => s.mode) ?? 'money';
  const moneyProfile = useAppStore((s) => s.moneyProfile);
  const businessProfile = useAppStore((s) => s.businessProfile);
  const earnings = useAppStore((s) => s.earnings);

  const launches = getLaunchesForMode(mode, moneyProfile, businessProfile);
  const primary = launches.find((l) => l.isPrimary);
  const alts = launches.filter((l) => !l.isPrimary);
  const usd = selectTotalEarnings('USD', earnings);
  const gel = selectTotalEarnings('GEL', earnings);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Pill>{mode === 'business' ? 'Business mode' : 'Money mode'}</Pill>
          <Pill>
            {mode === 'business'
              ? businessProfile?.location ?? 'Tbilisi'
              : moneyProfile?.location ?? 'NE Philly'}
          </Pill>
        </View>

        <Card style={styles.resultHead}>
          <Text style={styles.resultTitle}>
            {mode === 'business'
              ? `${launches.length} sales paths found.`
              : `${launches.length} launches ready.`}
          </Text>
          <Sub>
            {mode === 'business'
              ? 'Best first move: one scarce offer and the shortest path from see → DM → pay → deliver.'
              : 'Primary path proves demand before you spend. Alternatives stay $0-first.'}
          </Sub>
          <View style={styles.metrics}>
            {mode === 'business' ? (
              <>
                <Metric value={businessProfile?.adBudget ?? '0 GEL'} label="ads" />
                <Metric value="15–30m" label="to launch" />
                <Metric value={businessProfile?.remoteOk ? 'remote' : 'local'} label="ops" />
                <Metric value={String(launches.length)} label="channels" />
              </>
            ) : (
              <>
                <Metric value={`$${moneyProfile?.budgetUsd ?? 200}`} label="budget" />
                <Metric value={moneyProfile?.timeHours ?? '2–3h'} label="time" />
                <Metric value={moneyProfile?.hasCar ? 'car' : 'no car'} label="mobility" />
                <Metric value={moneyProfile?.channel ?? 'either'} label="channel" />
              </>
            )}
          </View>
          {(usd > 0 || gel > 0) && (
            <Text style={styles.earned}>
              Earned in demo: {usd > 0 ? `$${usd}` : ''}
              {usd > 0 && gel > 0 ? ' · ' : ''}
              {gel > 0 ? `${gel}₾` : ''}
            </Text>
          )}
        </Card>

        <SectionLabel>Best first experiment</SectionLabel>
        {primary ? (
          <LaunchCard launch={primary} onPress={() => router.push(`/launches/${primary.id}`)} />
        ) : null}

        {alts.length > 0 ? (
          <>
            <SectionLabel>
              {mode === 'business' ? 'More zero-ad channels' : 'Alternatives'}
            </SectionLabel>
            <View style={{ gap: 11 }}>
              {alts.map((l) => (
                <LaunchCard key={l.id} launch={l} onPress={() => router.push(`/launches/${l.id}`)} />
              ))}
            </View>
          </>
        ) : null}

        <Warning>
          Kisa never invents demand numbers or guarantees income. Offers are experiments — validate with
          real replies before you spend.
        </Warning>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48, gap: 0 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  resultHead: {
    borderColor: '#365542',
    backgroundColor: '#102019',
  },
  resultTitle: { color: '#bff7cf', fontWeight: '900', fontSize: 16 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  earned: {
    marginTop: 12,
    color: colors.gold,
    fontWeight: '800',
    fontSize: 13,
  },
});
