import { Tabs } from 'expo-router';
import { Image } from 'expo-image';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Image
      source={`sf:${name}`}
      style={{ width: 24, height: 24 }}
      tintColor={focused ? '#6366F1' : '#94A3B8'}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recordings',
          tabBarIcon: ({ focused }) => <TabIcon name="list.bullet" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ focused }) => <TabIcon name="mic.fill" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="gearshape.fill" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
