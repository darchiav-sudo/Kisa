import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Tag } from '@/src/components/ui';
import type { Launch } from '@/src/models/types';
import { colors } from '@/src/theme/colors';

export function LaunchCard({
  launch,
  onPress,
}: {
  launch: Launch;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
    >
      <Card style={launch.isPrimary ? styles.primary : undefined}>
        <View style={styles.head}>
          <View style={[styles.rank, launch.isPrimary && styles.rankPrimary]}>
            <Text style={[styles.rankText, launch.isPrimary && { color: colors.green }]}>
              #{launch.rank}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{launch.title}</Text>
            <Text style={styles.desc}>{launch.summary}</Text>
          </View>
        </View>
        <View style={styles.tags}>
          {launch.tags.map((t) => (
            <Tag
              key={t}
              tone={t.includes('primary') || t.includes('0') || t.includes('⚡') ? 'good' : t.toLowerCase().includes('scarcity') ? 'gold' : 'default'}
            >
              {t}
            </Tag>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.price}>{launch.economics.offerLabel}</Text>
          <Text style={styles.cta}>{launch.isPrimary ? 'Start primary →' : 'Open →'}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    borderColor: '#42674d',
  },
  head: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'flex-start',
  },
  rank: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#222b38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankPrimary: {
    backgroundColor: colors.greenDim,
  },
  rankText: {
    color: colors.text,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  desc: {
    color: colors.mutedSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: colors.gold,
    fontWeight: '900',
    fontSize: 14,
  },
  cta: {
    color: colors.blue,
    fontWeight: '800',
    fontSize: 13,
  },
});
