import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconName, tap } from '@/src/components/ui';
import { colors } from '@/src/theme/colors';

export type SheetAction = {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  /** Unread count shown next to the label. */
  badge?: number;
  onPress: () => void | Promise<void>;
};

type SheetRequest = { title: string; message?: string; actions: SheetAction[] };

let present: ((req: SheetRequest) => void) | null = null;

/** Bottom action sheet styled like the rest of Kisa (replaces the system alert). */
export function showSheet(req: SheetRequest) {
  present?.(req);
}

/** One-question confirm on top of `showSheet`. */
export function confirmSheet(opts: {
  title: string;
  message?: string;
  action: string;
  icon?: IconName;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  showSheet({
    title: opts.title,
    message: opts.message,
    actions: [{ label: opts.action, icon: opts.icon, destructive: opts.destructive, onPress: opts.onConfirm }],
  });
}

const native = Platform.OS !== 'web';

export function SheetHost() {
  const insets = useSafeAreaInsets();
  const [req, setReq] = useState<SheetRequest | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    present = (r) => {
      setReq(r);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    };
    return () => {
      present = null;
    };
  }, [anim]);

  const close = (then?: () => void) =>
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: native }).start(() => {
      setReq(null);
      then?.();
    });

  return (
    <Modal visible={!!req} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 14) + 6 },
          { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }] },
        ]}
      >
        <View style={styles.handle} />
        {req ? (
          <>
            <Text style={styles.title}>{req.title}</Text>
            {req.message ? <Text style={styles.message}>{req.message}</Text> : null}
            <View style={styles.actions}>
              {req.actions.map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    tap();
                    close(() => void a.onPress());
                  }}
                  style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
                >
                  {a.icon ? (
                    <Ionicons name={a.icon} size={19} color={a.destructive ? colors.danger : colors.white} />
                  ) : null}
                  <Text style={[styles.actionText, a.destructive && { color: colors.danger }]}>{a.label}</Text>
                  {a.badge ? <Badge count={a.badge} /> : null}
                </Pressable>
              ))}
              <Pressable onPress={() => close()} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

export function Badge({ count, style }: { count: number; style?: object }) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueBright,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0b0f1c',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 16,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  actions: { gap: 10, marginTop: 20 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  actionText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontSize: 15, fontWeight: '700' },
});
