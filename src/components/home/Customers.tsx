import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Card, type Flash, IconName, PrimaryButton } from '@/src/components/ui';
import type { Business } from '@/src/models/types';
import { colors } from '@/src/theme/colors';

export function shareSite(business: Business) {
  return Share.share({ message: `${business.kit.name} — ${business.kit.tagline}\n${business.siteUrl}` });
}

type FunnelStep = 'share' | 'visits' | 'orders' | 'sales';

/** Where the customer journey is stuck right now, and the one thing that moves it. */
function nextMove(business: Business): { step: FunnelStep; text: string; label: string; icon: IconName; go: () => void } {
  const visits = business.visits?.total ?? 0;
  const fresh = business.leads.find((l) => l.status === 'new');
  const waiting = business.leads.find((l) => l.status === 'replied');
  if (fresh) {
    return {
      step: 'orders',
      text: `${fresh.name} wants to order. Kisa already wrote your reply — send it now, fast replies win.`,
      label: `Reply to ${fresh.name}`,
      icon: 'chatbubble-ellipses',
      go: () => router.push(`/business/lead/${fresh.id}`),
    };
  }
  if (visits === 0) {
    return {
      step: 'share',
      text: 'Nobody has opened your website yet. Customers only come from the link you share — the posts in Today do exactly that.',
      label: 'Share my website',
      icon: 'share-social',
      go: () => void shareSite(business),
    };
  }
  if (business.leads.length === 0) {
    return {
      step: 'visits',
      text: `${visits} ${visits === 1 ? 'person' : 'people'} opened your site but nobody ordered yet. Tell Kisa in the check-in — it will sharpen your offer and price.`,
      label: 'Daily check-in',
      icon: 'chatbubble-ellipses',
      go: () => router.push('/business/checkin'),
    };
  }
  if (waiting) {
    return {
      step: 'sales',
      text: `${waiting.name} hasn’t said yes yet. A short, friendly follow-up today often closes it.`,
      label: `Open ${waiting.name}’s order`,
      icon: 'arrow-redo',
      go: () => router.push(`/business/lead/${waiting.id}`),
    };
  }
  return {
    step: 'share',
    text: 'More shares, more visits, more orders. Post your link somewhere new today.',
    label: 'Share my website',
    icon: 'share-social',
    go: () => void shareSite(business),
  };
}

/**
 * The whole customer journey in one place: people open the link you share, tap Order on the site,
 * you get a notification with a ready reply, and a sale becomes money you track.
 */
export function CustomersCard({ business, onFlash }: { business: Business; onFlash: Flash }) {
  const move = nextMove(business);
  const steps: { id: FunnelStep; icon: IconName; value: string; label: string }[] = [
    { id: 'share', icon: 'globe-outline', value: 'Live', label: 'website' },
    { id: 'visits', icon: 'eye-outline', value: String(business.visits?.week ?? 0), label: 'visits · 7d' },
    { id: 'orders', icon: 'bag-handle-outline', value: String(business.leads.length), label: 'orders' },
    { id: 'sales', icon: 'cash-outline', value: String(business.money.sales), label: 'sales' },
  ];
  return (
    <Card>
      <View style={styles.funnel}>
        {steps.map((s, i) => {
          const on = s.id === move.step;
          return (
            <View key={s.id} style={styles.funnelItem}>
              {i > 0 ? <Ionicons name="chevron-forward" size={12} color={colors.faint} style={styles.funnelArrow} /> : null}
              <View style={[styles.funnelIcon, on && styles.funnelIconOn]}>
                <Ionicons name={s.icon} size={16} color={on ? colors.black : colors.mutedSoft} />
              </View>
              <Text style={[styles.funnelValue, on && { color: colors.white }]}>{s.value}</Text>
              <Text style={styles.funnelLabel}>{s.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.moveText}>{move.text}</Text>
      <View style={{ marginTop: 12 }}>
        <PrimaryButton icon={move.icon} label={move.label} onPress={move.go} />
      </View>

      <View style={styles.siteRow}>
        <Pressable style={{ flex: 1 }} onPress={() => Linking.openURL(business.siteUrl)} accessibilityLabel="Open your website">
          <Text style={styles.siteUrl} numberOfLines={1}>
            {business.siteUrl.replace(/^https?:\/\//, '')}
          </Text>
          <Text style={styles.visitLine}>
            {business.visits?.total
              ? `${business.visits.today} today · ${business.visits.total} total visits`
              : 'Kisa counts real people, not link previews'}
          </Text>
        </Pressable>
        <Pressable
          hitSlop={8}
          style={styles.siteIconBtn}
          accessibilityLabel="Copy link"
          onPress={async () => {
            await Clipboard.setStringAsync(business.siteUrl);
            onFlash('Link copied');
          }}
        >
          <Ionicons name="copy-outline" size={16} color={colors.white} />
        </Pressable>
        <Pressable hitSlop={8} style={styles.siteIconBtn} accessibilityLabel="Share link" onPress={() => void shareSite(business)}>
          <Ionicons name="share-outline" size={16} color={colors.white} />
        </Pressable>
      </View>
    </Card>
  );
}

export function LeadList({ business }: { business: Business }) {
  if (business.leads.length === 0) return null;
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      {business.leads.map((l) => (
        <Pressable
          key={l.id}
          onPress={() => router.push(`/business/lead/${l.id}`)}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <Card style={styles.lead}>
            {l.status === 'new' ? <View style={styles.newDot} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.leadName}>{l.name}</Text>
              <Text style={styles.leadMsg} numberOfLines={1}>
                {l.message || l.contact}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blueBright },
  leadName: { color: colors.text, fontWeight: '800', fontSize: 15 },
  leadMsg: { color: colors.muted, fontSize: 13, marginTop: 2 },
  siteUrl: { color: colors.blueBright, fontWeight: '700', fontSize: 14 },
  visitLine: { color: colors.muted, fontSize: 12, marginTop: 3 },
  funnel: { flexDirection: 'row', marginBottom: 14 },
  funnelItem: { flex: 1, alignItems: 'center' },
  funnelArrow: { position: 'absolute', left: -6, top: 10 },
  funnelIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  funnelIconOn: { backgroundColor: colors.white, borderColor: colors.white },
  funnelValue: { color: colors.mutedSoft, fontSize: 16, fontWeight: '800', marginTop: 6 },
  funnelLabel: { color: colors.muted, fontSize: 11, marginTop: 1 },
  moveText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  siteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  siteIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
