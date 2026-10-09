import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, IconName, tap } from '@/src/components/ui';
import type { Idea } from '@/src/models/types';
import { colors } from '@/src/theme/colors';

const DIFFICULTY = {
  easy: { label: 'Easy', color: colors.cyan },
  medium: { label: 'Medium', color: colors.amber },
  hard: { label: 'Hard', color: colors.pink },
} as const;

export function IdeaCard({ idea }: { idea: Idea }) {
  const diff = DIFFICULTY[idea.difficulty] ?? DIFFICULTY.medium;
  return (
    <View>
      <Card style={{ padding: 20 }}>
        <View style={styles.top}>
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{idea.emoji}</Text>
          </View>
          <View style={styles.badges}>
            {idea.handsOff ? (
              <View style={[styles.badge, { borderColor: colors.violet }]}>
                <Ionicons name="flash" size={11} color={colors.violet} />
                <Text style={[styles.badgeText, { color: colors.violet }]}>Kisa runs it</Text>
              </View>
            ) : null}
            <View style={[styles.badge, { borderColor: diff.color }]}>
              <View style={[styles.badgeDot, { backgroundColor: diff.color }]} />
              <Text style={[styles.badgeText, { color: diff.color }]}>{diff.label}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.title}>{idea.title}</Text>
        <Text style={styles.oneLiner}>{idea.oneLiner}</Text>

        <View style={styles.facts}>
          <Fact icon="cash-outline" label="First money" value={idea.firstMoney} />
          <Fact icon="wallet-outline" label="To start" value={idea.startCost} />
          <Fact icon="time-outline" label="First order" value={idea.firstOrderEta} />
        </View>

        {idea.yourPart ? (
          <View style={styles.yourPart}>
            <Ionicons name="person-outline" size={14} color={colors.muted} />
            <Text style={styles.yourPartText}>
              <Text style={{ fontWeight: '800', color: colors.text }}>Your part: </Text>
              {idea.yourPart}
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={{ gap: 8, marginTop: 10 }}>
        <Fold icon="person-circle-outline" title="Why this fits you">
          {idea.whyYou.map((w) => (
            <View key={w} style={styles.bulletRow}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
              <Text style={styles.bullet}>{w}</Text>
            </View>
          ))}
        </Fold>

        {idea.evidence.length ? (
          <Fold icon="search-outline" title={`What Kisa found · ${Math.min(idea.evidence.length, 4)}`}>
            {idea.evidence.slice(0, 4).map((e) => (
              <Pressable
                key={e.title}
                disabled={!e.url}
                onPress={() => e.url && Linking.openURL(e.url)}
                style={({ pressed }) => [styles.evidence, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.evTitle}>{e.title}</Text>
                <Text style={styles.evDetail}>{e.detail}</Text>
                {e.source ? (
                  <View style={styles.evSourceRow}>
                    {e.url ? <Ionicons name="open-outline" size={12} color={colors.blueBright} /> : null}
                    <Text style={styles.evSource}>{e.source}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </Fold>
        ) : null}
      </View>
    </View>
  );
}

function Fold({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ paddingVertical: 4 }}>
      <Pressable
        onPress={() => {
          tap();
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        style={styles.foldHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons name={icon} size={18} color={colors.mutedSoft} />
        <Text style={styles.foldTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? <View style={{ paddingBottom: 10 }}>{children}</View> : null}
    </Card>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={15} color={colors.muted} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  emoji: { fontSize: 30 },
  badges: { flexDirection: 'row', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 14, letterSpacing: -0.5 },
  oneLiner: { color: colors.mutedSoft, fontSize: 15, lineHeight: 22, marginTop: 6 },
  facts: { flexDirection: 'row', gap: 8, marginTop: 16 },
  fact: {
    flex: 1,
    padding: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.line,
    gap: 3,
  },
  factLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  factValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  yourPart: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'flex-start' },
  yourPartText: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, flex: 1 },
  foldHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  foldTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'flex-start' },
  bullet: { color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 },
  evidence: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
  },
  evTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  evDetail: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, marginTop: 3 },
  evSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  evSource: { color: colors.blueBright, fontSize: 12, fontWeight: '700' },
});
