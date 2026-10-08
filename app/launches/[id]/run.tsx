import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  PrimaryButton,
  ProgressBar,
  ScriptBox,
  SecondaryButton,
  Sub,
  Title,
  Warning,
} from '@/src/components/ui';
import { getLaunchById } from '@/src/data/launches';
import type { LaunchAction } from '@/src/models/types';
import { services } from '@/src/services';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, spacing } from '@/src/theme/colors';

export default function LaunchRunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const launchId = String(id);
  const launch = getLaunchById(launchId);

  const progress = useAppStore((s) => s.progressByLaunchId[launchId]);
  const startLaunch = useAppStore((s) => s.startLaunch);
  const completeStep = useAppStore((s) => s.completeStep);
  const markPublished = useAppStore((s) => s.markPublished);
  const attachLead = useAppStore((s) => s.attachLead);
  const markBooked = useAppStore((s) => s.markBooked);
  const addEarning = useAppStore((s) => s.addEarning);
  const completeLaunch = useAppStore((s) => s.completeLaunch);
  const resetLaunchProgress = useAppStore((s) => s.resetLaunchProgress);
  const lastLeadPreview = useAppStore((s) => s.lastLeadPreview);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!progress) startLaunch(launchId);
  }, [progress, launchId, startLaunch]);

  const stepIndex = progress?.currentStepIndex ?? 0;
  const step = launch?.steps[stepIndex];
  const finished = !!launch && stepIndex >= launch.steps.length;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [stepIndex, fade]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  };

  const advance = (stepId: string) => {
    completeStep(launchId, stepId);
  };

  const onAction = async (action: LaunchAction) => {
    if (!launch || !step) return;
    setBusy(true);
    try {
      switch (action.type) {
        case 'copy':
          if (action.copyText) {
            await Clipboard.setStringAsync(action.copyText);
            showToast('Copied');
            services.analytics.track('copy', { launchId, stepId: step.id });
          }
          break;
        case 'open_link':
          if (action.url) await Linking.openURL(action.url);
          break;
        case 'simulate_publish':
          await services.distribution.simulatePublish(launchId, ['demo']);
          markPublished(launchId);
          showToast('Published (simulated)');
          advance(step.id);
          break;
        case 'simulate_wait':
          await new Promise((r) => setTimeout(r, step.autoAdvanceMs ?? 1200));
          showToast('Signal window open');
          advance(step.id);
          break;
        case 'simulate_lead': {
          const lead = await services.lead.simulateInbound(launchId);
          attachLead(launchId, lead.id, `${lead.name}: ${lead.message}`);
          showToast('Lead ready');
          advance(step.id);
          break;
        }
        case 'collect_payment':
          addEarning({
            launchId,
            amount: action.earningAmount ?? launch.economics.offerPrice,
            currency: launch.economics.currency,
            label: action.label,
          });
          showToast('Payment recorded');
          advance(step.id);
          break;
        case 'repeat':
          resetLaunchProgress(launchId);
          showToast('Launch reset');
          break;
        case 'approve':
        case 'mark_done':
          if (step.id === 'photos') {
            markBooked(launchId);
          }
          if (action.label.toLowerCase().includes('find another') || action.label.toLowerCase().includes('other channel') || action.label.toLowerCase().includes('back to launches')) {
            completeLaunch(launchId);
            router.replace('/launches');
            break;
          }
          advance(step.id);
          break;
        default:
          advance(step.id);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (finished && launch) {
      completeLaunch(launchId);
      router.replace({ pathname: '/done', params: { id: launchId } });
    }
  }, [finished, launch, launchId, completeLaunch]);

  const primaryActions = useMemo(
    () => step?.actions.filter((a) => a.primary || a.type !== 'copy' && a.type !== 'open_link') ?? [],
    [step],
  );
  const secondaryActions = useMemo(
    () => step?.actions.filter((a) => !primaryActions.includes(a)) ?? [],
    [step, primaryActions],
  );

  if (!launch) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: spacing.lg }}>
          <Title>Launch missing</Title>
          <PrimaryButton label="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (!step || finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.green} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressBar value={progress?.completedStepIds.length ?? 0} total={launch.steps.length} />
        <Text style={styles.stepMeta}>
          Step {stepIndex + 1} · {step.kind}
        </Text>

        <Animated.View style={{ opacity: fade }}>
          <Card done={progress?.completedStepIds.includes(step.id)}>
            <View style={styles.head}>
              <View style={styles.num}>
                <Text style={styles.numText}>{stepIndex + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Sub>{step.description}</Sub>
              </View>
            </View>

            {step.kind === 'lead' && lastLeadPreview ? (
              <Card style={{ marginTop: 12, backgroundColor: '#101a26', borderColor: '#334a63' }}>
                <Text style={{ color: '#cfe2f5', fontSize: 13, lineHeight: 19 }}>{lastLeadPreview}</Text>
              </Card>
            ) : null}

            {step.script ? <ScriptBox text={step.script} /> : null}

            {step.channels?.length ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {step.channels.map((c) => (
                  <Text key={c.id} style={styles.channel}>
                    → {c.name}
                  </Text>
                ))}
              </View>
            ) : null}

            {step.items?.length ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {step.items.map((item) => (
                  <Card key={item.title} style={{ padding: 12 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.price ? <Text style={styles.itemPrice}>{item.price}</Text> : null}
                    {item.detail ? <Text style={styles.itemDetail}>{item.detail}</Text> : null}
                    {item.url ? (
                      <View style={{ marginTop: 8 }}>
                        <SecondaryButton label="Open link" onPress={() => Linking.openURL(item.url!)} />
                      </View>
                    ) : null}
                  </Card>
                ))}
              </View>
            ) : null}

            {step.checklist?.length ? (
              <View style={styles.checkGrid}>
                {step.checklist.map((c) => (
                  <Text key={c} style={styles.checkIn}>
                    ✅ {c}
                  </Text>
                ))}
                {step.checklistOut?.map((c) => (
                  <Text key={c} style={styles.checkOut}>
                    ❌ {c}
                  </Text>
                ))}
              </View>
            ) : null}
          </Card>
        </Animated.View>

        <View style={styles.actions}>
          {secondaryActions.map((a) => (
            <SecondaryButton
              key={a.id}
              label={a.label}
              onPress={() => onAction(a)}
              tone={a.type === 'copy' ? 'default' : 'ghost'}
            />
          ))}
          {primaryActions.map((a) => (
            <PrimaryButton
              key={a.id}
              label={a.label}
              loading={busy}
              onPress={() => onAction(a)}
            />
          ))}
        </View>

        {toast ? <Text style={styles.toast}>{toast}</Text> : null}

        <Warning>
          No spend before signal. Equipment and ads come only after a booked job or clear demand.
        </Warning>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', gap: 11 },
  num: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#222a35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: colors.text, fontWeight: '900' },
  stepTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  channel: { color: colors.blue, fontWeight: '700', fontSize: 13 },
  itemTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  itemPrice: { color: colors.gold, fontWeight: '900', fontSize: 20, marginTop: 4 },
  itemDetail: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  checkGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkIn: {
    width: '47%',
    color: '#d4dde6',
    backgroundColor: '#0e1419',
    borderWidth: 1,
    borderColor: '#28333e',
    borderRadius: 12,
    padding: 9,
    fontSize: 12,
    overflow: 'hidden',
  },
  checkOut: {
    width: '47%',
    color: '#ffc9c9',
    backgroundColor: '#1a1212',
    borderWidth: 1,
    borderColor: '#4a3030',
    borderRadius: 12,
    padding: 9,
    fontSize: 12,
    overflow: 'hidden',
  },
  actions: { marginTop: spacing.lg, gap: 8 },
  toast: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.green,
    fontWeight: '800',
  },
});
