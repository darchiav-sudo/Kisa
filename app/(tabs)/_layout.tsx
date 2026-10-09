import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/src/components/Sheet';
import { IconName, tap } from '@/src/components/ui';
import { useUpdates } from '@/src/store/useAppStore';
import { useNotificationRouting } from '@/src/lib/notifications';
import { colors } from '@/src/theme/colors';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', iconOn: 'home' },
  new: { label: 'Find', icon: 'compass-outline', iconOn: 'compass' },
  saved: { label: 'Saved', icon: 'bookmark-outline', iconOn: 'bookmark' },
  profile: { label: 'Profile', icon: 'person-outline', iconOn: 'person' },
};

/** Hidden routes that still show the bar; they highlight their parent tab. */
const PARENT: Record<string, string> = { idea: 'new' };

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function KisaTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name ?? '';
  const activeTab = PARENT[current] ?? current;
  const updates = useUpdates();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = activeTab === route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (current !== route.name && !event.defaultPrevented) {
              tap();
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              style={styles.item}
            >
              <View>
                <Ionicons name={focused ? tab.iconOn : tab.icon} size={22} color={focused ? colors.white : colors.muted} />
                {route.name === 'index' && updates.total ? <Badge count={updates.total} style={styles.badge} /> : null}
              </View>
              <Text style={[styles.label, focused && styles.labelOn]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  useNotificationRouting();
  return (
    <Tabs
      tabBar={(props) => <KisaTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="new" />
      <Tabs.Screen name="saved" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="idea" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(10,14,28,0.96)',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  label: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 3 },
  labelOn: { color: colors.white, fontWeight: '800' },
  badge: { position: 'absolute', top: -6, right: -12 },
});
