import { Tabs } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/lib/theme-context';

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Image source={`sf:${name}`} style={{ width: 24, height: 24 }} tintColor={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recordings',
          tabBarIcon: ({ color }) => <TabIcon name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color }) => <TabIcon name="mic.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
