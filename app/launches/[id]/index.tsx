import { router, useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  Kicker,
  Metric,
  PrimaryButton,
  ProgressBar,
  ScriptBox,
  SectionLabel,
  Sub,
  Tag,
  Title,
  Warning,
} from '@/src/components/ui';
import { getLaunchById } from '@/src/data/launches';
import { services } from '@/src/services';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, spacing } from '@/src/theme/colors';

export default function LaunchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const launch = getLaunchById(String(id));
  const startLaunch = useAppStore((s) => s.startLaunch);
  const progress = useAppStore((s) => (id ? s.progressByLaunchId[String(id)] : undefined));

  if (!launch) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: spacing.lg }}>
          <Title>Launch not found</Title>
          <PrimaryButton label="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const done = progress?.completedStepIds.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Kicker tone={launch.mode === 'business' ? 'blue' : 'green'}>{launch.kicker}</Kicker>
        <Title>{launch.title}</Title>
        <Sub>{launch.summary}</Sub>

        <View style={styles.tags}>
          {launch.tags.map((t) => (
            <Tag key={t} tone={t.includes('⚡') || t.includes('0') ? 'good' : 'default'}>
              {t}
            </Tag>
          ))}
        </View>

        <View style={styles.metrics}>
          <Metric
            value={
              launch.economics.currency === 'USD'
                ? `$${launch.economics.offerPrice}`
                : `${launch.economics.offerPrice}₾`
            }
            label="offer"
          />
          <Metric
            value={
              launch.economics.adSpend === 0
                ? '0 ads'
                : String(launch.economics.adSpend)
            }
            label="ad spend"
          />
          {launch.economics.starterCost != null ? (
            <Metric value={`~$${launch.economics.starterCost}`} label="kit after signal" />
          ) : (
            <Metric
              value={String(launch.economics.targetUnits ?? launch.steps.length)}
              label={launch.economics.targetUnits ? 'sales goal' : 'steps'}
            />
          )}
          {launch.economics.reserveLeft != null ? (
            <Metric value={`~$${launch.economics.reserveLeft}`} label="keep reserve" />
          ) : (
            <Metric value={String(launch.steps.length)} label="guided steps" />
          )}
        </View>

        {progress ? (
          <View style={{ marginTop: 14 }}>
            <ProgressBar value={done} total={launch.steps.length} />
          </View>
        ) : null}

        {launch.whyNow ? (
          <Card style={{ marginTop: 14, borderColor: '#48502a', backgroundColor: '#211f10' }}>
            <Text style={{ color: '#f5e8b1', fontSize: 13, lineHeight: 19 }}>
              Why now: {launch.whyNow}
            </Text>
          </Card>
        ) : null}

        <SectionLabel>Evidence</SectionLabel>
        <View style={{ gap: 8 }}>
          {launch.evidence.map((e) => (
            <Card key={e.id}>
              <Text style={styles.evTitle}>{e.title}</Text>
              <Text style={styles.evDetail}>{e.detail}</Text>
              {e.sourceLabel ? (
                <Text style={styles.evSource}>{e.sourceLabel}</Text>
              ) : null}
            </Card>
          ))}
        </View>

        <SectionLabel>Economics notes</SectionLabel>
        {launch.economics.notes.map((n) => (
          <Text key={n} style={styles.note}>
            • {n}
          </Text>
        ))}

        {launch.steps[0]?.script ? (
          <>
            <SectionLabel>Preview copy</SectionLabel>
            <ScriptBox text={launch.steps[0].script} />
          </>
        ) : null}

        <Warning>
          Demo uses mocked publish/leads. Real channels open in browser when available; nothing spends
          money for you.
        </Warning>

        <View style={{ marginTop: spacing.lg, gap: 10 }}>
          <PrimaryButton
            label={progress ? 'Resume launch' : 'Start launch'}
            onPress={() => {
              startLaunch(launch.id);
              services.analytics.track('launch_start', { id: launch.id });
              router.push(`/launches/${launch.id}/run`);
            }}
          />
          {launch.steps
            .flatMap((s) => s.channels ?? [])
            .slice(0, 2)
            .map((c) =>
              c.url ? (
                <PrimaryButton
                  key={c.id}
                  label={`Open ${c.name}`}
                  onPress={() => Linking.openURL(c.url!)}
                />
              ) : null,
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  evTitle: { color: colors.text, fontWeight: '900', fontSize: 15 },
  evDetail: { color: colors.mutedSoft, marginTop: 4, fontSize: 13, lineHeight: 19 },
  evSource: { color: colors.blue, marginTop: 8, fontSize: 12, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
});
