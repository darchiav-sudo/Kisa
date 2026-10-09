import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, type Flash, IconName, tap } from '@/src/components/ui';
import { runKisaNow } from '@/src/lib/business';
import type { AgentEvent, Business } from '@/src/models/types';
import { colors } from '@/src/theme/colors';

const EVENT: Record<string, { icon: IconName; color: string }> = {
  scout: { icon: 'telescope', color: colors.mutedSoft },
  site: { icon: 'globe', color: colors.mutedSoft },
  plan: { icon: 'list', color: colors.mutedSoft },
  followup: { icon: 'arrow-redo', color: colors.mutedSoft },
  checkin: { icon: 'chatbubble-ellipses', color: colors.mutedSoft },
  test: { icon: 'flask', color: colors.mutedSoft },
  reply: { icon: 'paper-plane', color: colors.mutedSoft },
  post: { icon: 'megaphone', color: colors.mutedSoft },
  connect: { icon: 'link', color: colors.mutedSoft },
};

export function timeAgo(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** What Kisa did on its own, plus a button to make it work right now. */
export function AgentCard({
  business,
  onFlash,
  limit = 3,
}: {
  business: Business;
  onFlash: Flash;
  limit?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const log = (business.agentLog ?? []).slice(0, limit);

  const work = async () => {
    setBusy(true);
    try {
      const did = await runKisaNow(business.id);
      tap('success');
      onFlash(did.length ? `Kisa ${did.join(', ')}` : 'Everything is already up to date');
    } catch (e) {
      onFlash((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      {log.length === 0 ? (
        <Text style={styles.empty}>
          Kisa works on your business by itself: it checks competitors, finds new places for customers, rewrites
          your website when visitors don’t order, plans your day and writes follow-ups.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {log.map((e) => (
            <EventRow key={e.id} event={e} open={openId === e.id} onPress={() => setOpenId(openId === e.id ? null : e.id)} />
          ))}
        </View>
      )}
      <Pressable
        onPress={work}
        disabled={busy}
        style={({ pressed }) => [styles.workBtn, (pressed || busy) && { opacity: 0.8 }]}
      >
        {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="flash" size={16} color={colors.white} />}
        <Text style={styles.workText}>{busy ? 'Kisa is working… (about 30s)' : 'Let Kisa work now'}</Text>
      </Pressable>
    </Card>
  );
}

function EventRow({ event, open, onPress }: { event: AgentEvent; open: boolean; onPress: () => void }) {
  const look = EVENT[event.kind] ?? { icon: 'paw' as IconName, color: colors.mutedSoft };
  return (
    <Pressable onPress={onPress} disabled={!event.detail} style={styles.event}>
      <View style={styles.eventIcon}>
        <Ionicons name={look.icon} size={14} color={look.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventTime}>{timeAgo(event.createdAt)}</Text>
        {open && event.detail ? <Text style={styles.eventDetail}>{event.detail}</Text> : null}
      </View>
      {event.detail ? <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.mutedSoft, fontSize: 14, lineHeight: 20 },
  event: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  eventIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  eventTitle: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  eventTime: { color: colors.muted, fontSize: 12, marginTop: 1 },
  eventDetail: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, marginTop: 6 },
  workBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  workText: { color: colors.white, fontSize: 14, fontWeight: '800' },
});
