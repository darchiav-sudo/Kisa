import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop, Card, IconName, tap } from '@/src/components/ui';
import { findIdeaNow } from '@/src/lib/nav';
import { useAppStore } from '@/src/store/useAppStore';
import { colors, gradients } from '@/src/theme/colors';

export default function NewScreen() {
  const intake = useAppStore((s) => s.intake);
  const business = useAppStore((s) => s.business);

  const summary = intake
    ? [intake.location, ...intake.skills.slice(0, 3), ...intake.assets.slice(0, 2)].filter(Boolean)
    : [];

  return (
    <View style={styles.root}>
      <Backdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>New business</Text>
          <Text style={styles.sub}>Kisa researches your area live and finds an easy business to start.</Text>

          {intake ? (
            <Pressable
              onPress={() => {
                tap('medium');
                findIdeaNow('hands-on');
              }}
              style={({ pressed }) => [styles.heroWrap, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <LinearGradient
                colors={[...gradients.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroIcon}>
                  <Ionicons name="flash" size={24} color={colors.white} />
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
              </LinearGradient>
            </Pressable>
          ) : null}

          <View style={{ gap: 10, marginTop: intake ? 14 : 22 }}>
            <Option
              icon="flash"
              color={colors.violet}
              title="Find one Kisa can run for me"
              text="Kisa does the work. You approve, send and get paid — a few minutes a day."
              onPress={() =>
                intake
                  ? findIdeaNow('hands-off')
                  : router.push({ pathname: '/onboarding', params: { mode: 'hands-off' } })
              }
              strong
            />
            <Option
              icon="sparkles"
              color={colors.pink}
              title={intake ? 'Answer the questions again' : 'Find me a business'}
              text={intake ? 'Changed something? Update your answers first.' : 'A few taps about you. No typing.'}
              onPress={() => router.push('/onboarding')}
            />
            <Option
              icon="bookmark"
              color={colors.cyan}
              title="Saved ideas & businesses"
              text="Pick up something you saved before."
              onPress={() => router.navigate('/saved')}
            />
          </View>

          {business ? (
            <View style={styles.note}>
              <Ionicons name="information-circle" size={16} color={colors.muted} />
              <Text style={styles.noteText}>
                Building a new business pauses “{business.kit.name}”. You can bring it back from Saved.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Option({
  icon,
  color,
  title,
  text,
  onPress,
  strong,
}: {
  icon: IconName;
  color: string;
  title: string;
  text: string;
  onPress: () => void;
  strong?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <Card active={strong} style={styles.option}>
        <View style={[styles.optionIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionText}>{text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 130 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 8 },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 6 },
  heroWrap: {
    marginTop: 22,
    borderRadius: 26,
    shadowColor: colors.blue,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  hero: { borderRadius: 26, padding: 22 },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 16, letterSpacing: -0.4 },
  heroText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 180,
  },
  chipText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  optionText: { color: colors.muted, fontSize: 13, marginTop: 2 },
  note: { flexDirection: 'row', gap: 8, marginTop: 20, paddingHorizontal: 4 },
  noteText: { color: colors.muted, fontSize: 13, lineHeight: 18, flex: 1 },
});
