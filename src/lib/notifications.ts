import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { apiFetch } from '@/src/lib/api';
import type { Business } from '@/src/models/types';

type NotificationsModule = typeof import('expo-notifications');

const MORNING_ID = 'kisa-morning';
const EVENING_ID = 'kisa-evening';

let notifications: NotificationsModule | null | undefined;

/**
 * expo-notifications throws on import in Expo Go for Android (SDK 53+), so load it lazily
 * and run without notifications there. Dev/store builds and Expo Go on iOS get everything.
 */
function getNotifications(): NotificationsModule | null {
  if (notifications !== undefined) return notifications;
  notifications = null;
  const expoGoAndroid =
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'web' || expoGoAndroid) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notifications = mod;
  } catch (e) {
    console.warn('notifications unavailable', e);
  }
  return notifications;
}

let pushToken: string | null = null;

async function permitted(N: NotificationsModule) {
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'Kisa',
      importance: N.AndroidImportance.HIGH,
    });
  }
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await N.requestPermissionsAsync()).granted;
}

async function registerPushToken(N: NotificationsModule) {
  if (pushToken || !Device.isDevice) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;
  const { data } = await N.getExpoPushTokenAsync({ projectId });
  await apiFetch('/v1/push-token', { method: 'POST', json: { token: data, platform: Platform.OS } });
  pushToken = data;
}

/**
 * Morning: today's tasks. Evening: a check-in nudge. Rescheduled whenever the business changes,
 * so the morning message always lists the current tasks.
 */
async function scheduleDaily(N: NotificationsModule, business: Business) {
  const todo = business.tasks.filter((t) => t.status === 'todo');
  await Promise.all([
    N.cancelScheduledNotificationAsync(MORNING_ID).catch(() => undefined),
    N.cancelScheduledNotificationAsync(EVENING_ID).catch(() => undefined),
  ]);
  await N.scheduleNotificationAsync({
    identifier: MORNING_ID,
    content: {
      title: `${business.kit.emoji} ${business.kit.name} · today`,
      body: todo.length
        ? todo
            .slice(0, 3)
            .map((t) => `• ${t.title}`)
            .join('\n')
        : 'Tell Kisa what happened and get your next steps.',
      data: { url: '/' },
    },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
  });
  await N.scheduleNotificationAsync({
    identifier: EVENING_ID,
    content: {
      title: 'How did today go?',
      body: '30-second check-in. Kisa plans tomorrow for you.',
      data: { url: '/business/checkin' },
    },
    trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
  });
}

/** Asks once (right after the user has a business — the moment it's clearly useful), then keeps reminders fresh. */
export async function syncNotifications(business: Business | null) {
  const N = getNotifications();
  if (!N) return;
  try {
    if (!business) {
      await N.cancelAllScheduledNotificationsAsync();
      return;
    }
    if (!(await permitted(N))) return;
    await scheduleDaily(N, business);
    await registerPushToken(N).catch((e) => console.warn('push token', e));
  } catch (e) {
    console.warn('notifications', e);
  }
}

/** Call before signing out so this device stops getting the old account's alerts. */
export async function forgetDevice() {
  const N = getNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync().catch(() => undefined);
  if (pushToken) {
    await apiFetch('/v1/push-token', { method: 'DELETE', json: { token: pushToken } }).catch(() => undefined);
    pushToken = null;
  }
}

/** Tapping a notification opens the screen it points to. */
export function useNotificationRouting() {
  useEffect(() => {
    const N = getNotifications();
    if (!N) return;
    const open = (response: import('expo-notifications').NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    void N.getLastNotificationResponseAsync().then(open);
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
