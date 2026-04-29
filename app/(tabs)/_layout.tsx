import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { APP_COLORS } from '../../constants/colors';

function TabIcon({ emoji, active }: { emoji: string; active: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: active ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: APP_COLORS.tabBar,
          borderTopColor: APP_COLORS.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: APP_COLORS.tabActive,
        tabBarInactiveTintColor: APP_COLORS.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Delivery',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛵" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="inside"
        options={{
          title: 'Inside',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" active={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" active={focused} />,
        }}
      />
    </Tabs>
  );
}
