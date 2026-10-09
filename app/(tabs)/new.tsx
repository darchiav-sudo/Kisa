import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop, Card, IconName, tap } from '@/src/components/ui';
import { findIdeaNow } from '@/src/lib/nav';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

export default function NewScreen() {
  const intake = useAppStore((s) => s.intake);

  const summary = intake
    ? [intake.location, ...intake.skills.slice(0, 3), ...intake.assets.slice(0, 2)].filter(Boolean)
    : [];

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>New business</Text>

          {intake ? (
            <Pressable
              onPress={() => {
                tap('medium');
                findIdeaNow('hands-on');
              }}
              style={({ pressed }) => [styles.heroWrap, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <View style={styles.hero}>
                <View style={styles.heroIcon}>
                  <Ionicons name="flash" size={22} color={colors.ink} />
                </View>
                <Text style={styles.heroTitle}>Find me a business</Text>
                <Text style={styles.heroText}>One tap. Uses your saved answers.</Text>
                <View style={styles.chips}>
                  {summary.map((s) => (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>
                        {s}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          ) : null}

          <View style={{ gap: 10, marginTop: intake ? 14 : 22 }}>
            {intake ? (
              <Option icon="telescope" title="Hunt hidden opportunities" onPress={() => router.push('/gaps')} />
            ) : null}
            <Option
              icon="flash-outline"
              title="Find one Kisa can run for me"
              onPress={() =>
                intake
                  ? findIdeaNow('hands-off')
                  : router.push({ pathname: '/onboarding', params: { mode: 'hands-off' } })
              }
            />
            {!intake ? (
              <Option
                icon="sparkles"
                title="Find me a business"
                onPress={() => router.push('/onboarding')}
              />
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Option({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <Card style={styles.option}>
        <View style={styles.optionIcon}>
          <Ionicons name={icon} size={19} color={colors.white} />
        </View>
        <Text style={[styles.optionTitle, { flex: 1 }]}>{title}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 130 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
  heroWrap: { marginTop: 22, borderRadius: 26 },
  hero: { borderRadius: 26, padding: 22, backgroundColor: colors.paper },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  heroTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 16, letterSpacing: -0.4 },
  heroText: { color: colors.inkSoft, fontSize: 14, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 180,
  },
  chipText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
});
