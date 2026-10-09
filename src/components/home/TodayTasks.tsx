import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { confirmSheet } from '@/src/components/Sheet';
import { Card, type Flash, IconName, tap } from '@/src/components/ui';
import { postToTelegram, setTaskStatus } from '@/src/lib/business';
import type { Business, Task } from '@/src/models/types';
import { colors } from '@/src/theme/colors';

export const KIND: Record<Task['kind'], { icon: IconName; color: string }> = {
  setup: { icon: 'settings', color: colors.mutedSoft },
  post: { icon: 'megaphone', color: colors.mutedSoft },
  message: { icon: 'chatbubbles', color: colors.mutedSoft },
  do: { icon: 'checkmark-done', color: colors.mutedSoft },
  buy: { icon: 'cart', color: colors.mutedSoft },
  learn: { icon: 'bulb', color: colors.mutedSoft },
};

/** Share links that already carry the message, so there is nothing to paste. */
function embedsText(url: string) {
  return /^(sms:|mailto:)|wa\.me\/.*text=|t\.me\/share|api\.whatsapp\.com\/send|facebook\.com\/sharer/i.test(url);
}

/** The server only returns finished tasks from the last two days. */
export function todayProgress(business: Business) {
  const todo = business.tasks.filter((t) => t.status === 'todo');
  const done = business.tasks.filter((t) => t.status === 'done');
  const skipped = business.tasks.filter((t) => t.status === 'skipped');
  return { todo, done, skipped, total: todo.length + done.length };
}

/**
 * One task open at a time: the next thing to do, with its main action and Done.
 * Everything else is a single line you can tick off or tap to open.
 */
export function TodayTasks({ business, onFlash }: { business: Business; onFlash: Flash }) {
  const { todo, done, skipped, total } = todayProgress(business);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const open = todo.find((t) => t.id === openId) ?? todo[0];
  const finished = [...done, ...skipped];
  const historyLabel = skipped.length ? `Done & skipped (${finished.length})` : `Show done (${done.length})`;

  return (
    <View>
      <View style={styles.progressRow}>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${total ? (done.length / total) * 100 : 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {done.length}/{total || 0} done
        </Text>
      </View>

      {todo.length === 0 ? (
        <Card>
          <Text style={styles.allDoneTitle}>All done for now 🎉</Text>
          <Text style={styles.allDoneText}>Tell Kisa how it went and it plans what’s next.</Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {todo.map((t) =>
            t.id === open?.id ? (
              <OpenTask key={t.id} task={t} business={business} onFlash={onFlash} />
            ) : (
              <TaskLine key={t.id} task={t} business={business} onOpen={() => setOpenId(t.id)} onFlash={onFlash} />
            ),
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Pressable onPress={() => router.push('/business/checkin')} style={styles.checkin} hitSlop={6}>
          <Ionicons name="chatbubble-ellipses" size={15} color={colors.blueBright} />
          <Text style={styles.checkinText}>Tell Kisa how it went</Text>
        </Pressable>
        {finished.length ? (
          <Pressable onPress={() => setShowDone((v) => !v)} hitSlop={6}>
            <Text style={styles.doneToggle}>{showDone ? 'Hide' : historyLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {showDone ? finished.map((t) => <DoneRow key={t.id} task={t} business={business} />) : null}
    </View>
  );
}

function useTaskUpdate(business: Business, task: Task, onFlash: Flash) {
  const [busy, setBusy] = useState(false);
  const update = async (status: 'done' | 'skipped') => {
    setBusy(true);
    try {
      await setTaskStatus(business.id, task.id, status);
      const undo = () =>
        void setTaskStatus(business.id, task.id, 'todo').catch((e) => onFlash((e as Error).message));
      if (status === 'done') {
        tap('success');
        onFlash('Nice! Done', undo);
      } else {
        onFlash('Task skipped', undo);
      }
    } catch (e) {
      onFlash((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, update };
}

function TaskLine({
  task,
  business,
  onOpen,
  onFlash,
}: {
  task: Task;
  business: Business;
  onOpen: () => void;
  onFlash: Flash;
}) {
  const kind = KIND[task.kind] ?? KIND.do;
  const { busy, update } = useTaskUpdate(business, task, onFlash);
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.line, (busy || pressed) && { opacity: 0.6 }]}>
      <Ionicons name={kind.icon} size={15} color={kind.color} />
      <Text style={styles.lineTitle} numberOfLines={1}>
        {task.title}
      </Text>
      <Pressable
        hitSlop={10}
        disabled={busy}
        onPress={() => update('done')}
        style={styles.check}
        accessibilityLabel={`Mark ${task.title} done`}
      />
    </Pressable>
  );
}

function OpenTask({ task, business, onFlash }: { task: Task; business: Business; onFlash: Flash }) {
  const kind = KIND[task.kind] ?? KIND.do;
  const { busy, update } = useTaskUpdate(business, task, onFlash);
  const [more, setMore] = useState(true);
  const [posting, setPosting] = useState(false);
  const channel = task.kind === 'post' ? business.connections?.telegramChannel : null;
  const pasteFirst = !!task.copyText && !!task.url && !embedsText(task.url);

  const main = task.url
    ? {
        icon: (pasteFirst ? 'copy-outline' : 'open-outline') as IconName,
        label: pasteFirst ? `Copy & ${(task.linkLabel || 'open').toLowerCase()}` : task.linkLabel || 'Open',
        run: async () => {
          if (pasteFirst) {
            await Clipboard.setStringAsync(task.copyText!);
            onFlash('Text copied — paste it');
          }
          await Linking.openURL(task.url!).catch(() => onFlash('Could not open that link'));
        },
      }
    : task.copyText
      ? {
          icon: 'copy-outline' as IconName,
          label: 'Copy text',
          run: async () => {
            await Clipboard.setStringAsync(task.copyText!);
            onFlash('Copied');
          },
        }
      : null;

  return (
    <View style={[styles.openCard, busy && { opacity: 0.6 }]}>
      <Pressable onPress={() => setMore((v) => !v)} style={styles.openHead}>
        <View style={styles.taskIcon}>
          <Ionicons name={kind.icon} size={16} color={colors.ink} />
        </View>
        <Text style={styles.openTitle}>{task.title}</Text>
        <Pressable
          hitSlop={10}
          disabled={busy}
          onPress={() => update('done')}
          style={[styles.check, styles.openCheck]}
          accessibilityLabel={`Mark ${task.title} done`}
        />
      </Pressable>

      {channel && task.copyText ? (
        <Pressable
          disabled={posting}
          onPress={async () => {
            setPosting(true);
            try {
              await postToTelegram(business.id, task.copyText!);
              tap('success');
              onFlash(`Posted to ${channel.title}`);
            } catch (e) {
              onFlash((e as Error).message);
            } finally {
              setPosting(false);
            }
          }}
          style={({ pressed }) => [styles.tgBtn, (pressed || posting) && { opacity: 0.7 }]}
        >
          {posting ? <ActivityIndicator size="small" color={colors.ink} /> : <Ionicons name="paper-plane" size={14} color="#1a8fd0" />}
          <Text style={styles.tgText} numberOfLines={1}>
            Post to {channel.title}
          </Text>
        </Pressable>
      ) : null}

      {more ? (
        <>
          <Text style={styles.why}>{task.why}</Text>
          {task.copyText ? (
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(task.copyText!);
                onFlash('Copied');
              }}
            >
              <Text style={styles.copyPreview}>{task.copyText}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <View style={styles.actions}>
        {main ? (
          <Pressable onPress={main.run} style={({ pressed }) => [styles.mainBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name={main.icon} size={15} color={colors.ink} />
            <Text style={styles.mainBtnText} numberOfLines={1}>
              {main.label}
            </Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          onPress={() =>
            confirmSheet({
              title: 'Skip this task?',
              message: 'You can bring it back any time from “Done & skipped”.',
              action: 'Skip it',
              icon: 'play-skip-forward',
              onConfirm: () => update('skipped'),
            })
          }
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
          accessibilityLabel={`Skip ${task.title}`}
        >
          <Ionicons name="play-skip-forward" size={15} color={colors.inkSoft} />
        </Pressable>
        <Pressable
          onPress={() => update('done')}
          disabled={busy}
          style={({ pressed }) => [styles.doneBtn, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Ionicons name="checkmark" size={16} color={colors.white} />
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DoneRow({ task, business }: { task: Task; business: Business }) {
  const [busy, setBusy] = useState(false);
  const skipped = task.status === 'skipped';
  return (
    <View style={[styles.doneRow, busy && { opacity: 0.5 }]}>
      <Ionicons name={skipped ? 'play-skip-forward' : 'checkmark-circle'} size={16} color={colors.mutedSoft} />
      <Text style={[styles.doneLine, skipped && styles.skippedLine]} numberOfLines={1}>
        {task.title}
      </Text>
      <Pressable
        hitSlop={10}
        disabled={busy}
        onPress={async () => {
          tap();
          setBusy(true);
          try {
            await setTaskStatus(business.id, task.id, 'todo');
          } finally {
            setBusy(false);
          }
        }}
        style={styles.undo}
        accessibilityLabel={`Undo ${task.title}`}
      >
        <Ionicons name="arrow-undo" size={13} color={colors.white} />
        <Text style={styles.undoText}>{skipped ? 'Bring back' : 'Undo'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.pill, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.blueBright },
  progressText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  allDoneTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  allDoneText: { color: colors.muted, fontSize: 14, marginTop: 4 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  lineTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong },
  openCard: { borderRadius: 20, padding: 16, backgroundColor: colors.paper },
  openHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  openCheck: { borderColor: colors.inkLine },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,16,32,0.07)',
  },
  openTitle: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '800', lineHeight: 21 },
  why: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 10 },
  copyPreview: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: 'rgba(11,16,32,0.06)',
    borderRadius: 12,
    padding: 10,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  tgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkLine,
  },
  tgText: { color: colors.ink, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkLine,
  },
  mainBtnText: { color: colors.ink, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  skipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inkLine,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  doneBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  checkin: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkinText: { color: colors.blueBright, fontSize: 14, fontWeight: '700' },
  doneToggle: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 4 },
  doneLine: { color: colors.muted, fontSize: 13, textDecorationLine: 'line-through', flex: 1 },
  skippedLine: { textDecorationLine: 'none', fontStyle: 'italic' },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  undoText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
