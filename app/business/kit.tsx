import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, SecondaryButton, SectionLabel, tap } from '@/src/components/ui';
import { formatMoney } from '@/src/lib/business';
import { useAppStore } from '@/src/store/useAppStore';
import { colors } from '@/src/theme/colors';

export default function KitScreen() {
  const business = useAppStore((s) => s.business);
  const [copied, setCopied] = useState<string | null>(null);
  if (!business) return null;
  const { kit, money } = business;
  const unlocked = money.sales > 0 || business.stage !== 'launch';

  const copy = async (key: string, text: string) => {
    await Clipboard.setStringAsync(text);
    tap('success');
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <SectionLabel>Your offer</SectionLabel>
        <Card active>
          <Text style={styles.price}>
            {formatMoney(kit.offer.price, money.currency)} <Text style={styles.unit}>{kit.offer.unit}</Text>
          </Text>
          <Text style={styles.cardTitle}>{kit.offer.title}</Text>
          <Text style={styles.text}>{kit.offer.description}</Text>
          <View style={styles.why}>
            <Ionicons name="bulb" size={15} color={colors.amber} />
            <Text style={styles.whyText}>{kit.offer.priceReason}</Text>
          </View>
          {kit.offer.includes.map((i) => (
            <View key={i} style={styles.line}>
              <Ionicons name="checkmark-circle" size={16} color={colors.blueBright} />
              <Text style={styles.lineText}>{i}</Text>
            </View>
          ))}
          {kit.offer.excludes.map((i) => (
            <View key={i} style={styles.line}>
              <Ionicons name="close-circle" size={16} color={colors.pink} />
              <Text style={styles.lineText}>{i}</Text>
            </View>
          ))}
        </Card>

        <SectionLabel>Where to post</SectionLabel>
        <View style={styles.stack}>
          {kit.channels.map((ch, i) => (
            <Card key={ch.name}>
              <Text style={styles.cardTitle}>{ch.name}</Text>
              <Text style={styles.text}>{ch.why}</Text>
              <Text style={styles.script}>{ch.postText}</Text>
              <View style={styles.actions}>
                <SecondaryButton
                  small
                  icon={copied === `ch${i}` ? 'checkmark' : 'copy-outline'}
                  label={copied === `ch${i}` ? 'Copied' : 'Copy post'}
                  onPress={() => copy(`ch${i}`, ch.postText)}
                />
                {ch.url ? (
                  <SecondaryButton small icon="open-outline" label="Open" onPress={() => Linking.openURL(ch.url!)} />
                ) : null}
              </View>
            </Card>
          ))}
        </View>

        <SectionLabel>Reply scripts</SectionLabel>
        <View style={styles.stack}>
          {kit.replyScripts.map((r, i) => (
            <Card key={r.situation}>
              <Text style={styles.cardTitle}>{r.situation}</Text>
              <Text style={styles.script}>{r.text}</Text>
              <View style={styles.actions}>
                <SecondaryButton
                  small
                  icon={copied === `r${i}` ? 'checkmark' : 'copy-outline'}
                  label={copied === `r${i}` ? 'Copied' : 'Copy'}
                  onPress={() => copy(`r${i}`, r.text)}
                />
              </View>
            </Card>
          ))}
        </View>

        {kit.shoppingList.length ? (
          <>
            <SectionLabel>Shopping list</SectionLabel>
            {!unlocked ? (
              <View style={styles.locked}>
                <Ionicons name="lock-closed" size={15} color={colors.gold} />
                <Text style={styles.lockedText}>
                  Unlocks after your first sale. Kisa never wants you to spend before a real customer pays.
                </Text>
              </View>
            ) : null}
            <View style={styles.stack}>
              {kit.shoppingList.map((s) => (
                <Card key={s.item} style={!unlocked ? { opacity: 0.45 } : undefined}>
                  <Text style={styles.cardTitle}>
                    {s.item} {s.price ? <Text style={{ color: colors.gold }}>· {s.price}</Text> : null}
                  </Text>
                  <Text style={styles.text}>{s.why}</Text>
                  {s.where ? <Text style={styles.text}>{s.where}</Text> : null}
                  {s.url && unlocked ? (
                    <View style={styles.actions}>
                      <SecondaryButton small icon="open-outline" label="Open store" onPress={() => Linking.openURL(s.url!)} />
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          </>
        ) : null}

        {kit.learn.length ? (
          <>
            <SectionLabel>Business words, simply</SectionLabel>
            {kit.learn.map((l) => (
              <View key={l.term} style={styles.learn}>
                <Text style={styles.term}>{l.term}</Text>
                <Text style={styles.text}>{l.explain}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, paddingBottom: 48 },
  stack: { gap: 10 },
  price: { color: colors.gold, fontSize: 32, fontWeight: '800' },
  unit: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 },
  text: { color: colors.mutedSoft, fontSize: 14, lineHeight: 20, marginTop: 6 },
  why: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4 },
  whyText: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, flex: 1 },
  line: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'flex-start' },
  lineText: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 },
  script: {
    marginTop: 10,
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 10,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  locked: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  lockedText: { color: colors.gold, fontSize: 13, lineHeight: 19, flex: 1 },
  learn: { marginBottom: 14 },
  term: { color: colors.blueBright, fontSize: 15, fontWeight: '800' },
});
