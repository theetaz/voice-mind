import { Tabs } from 'expo-router';
import { View, Text, Pressable, Platform, StyleSheet, Dimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/lib/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BTN_SIZE = 60;
const CUTOUT_R = 42;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'ios' ? insets.bottom : 12;
  const activeRoute = state.routes[state.index]?.name;
  const isRecordActive = activeRoute === 'record';

  const onPress = (index: number) => {
    const route = state.routes[index];
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented && state.index !== index) {
      navigation.navigate(route.name);
    }
  };

  const centerX = SCREEN_WIDTH / 2;
  const recordBtnWrapWidth = BTN_SIZE + 8;
  const barContentHeight = 8 + 52 + bottomPad;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: bottomPad,
          },
        ]}
      >
        <View
          style={[
            styles.cutout,
            {
              backgroundColor: colors.background,
              left: centerX - CUTOUT_R,
            },
          ]}
        />
        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            onPress={() => onPress(0)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Recordings tab"
          >
            <View style={styles.tabContent}>
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={state.index === 0 ? 'list' : 'list-outline'}
                  size={28}
                  color={state.index === 0 ? colors.primary : colors.mutedForeground}
                />
              </View>
              <Text
                style={[styles.label, { color: state.index === 0 ? colors.primary : colors.mutedForeground }]}
                numberOfLines={1}
              >
                Recordings
              </Text>
            </View>
          </Pressable>

          <View style={styles.centerSpacer} pointerEvents="box-none" />

          <Pressable
            style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
            onPress={() => onPress(2)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Settings tab"
          >
            <View style={styles.tabContent}>
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={state.index === 2 ? 'settings' : 'settings-outline'}
                  size={28}
                  color={state.index === 2 ? colors.primary : colors.mutedForeground}
                />
              </View>
              <Text
                style={[styles.label, { color: state.index === 2 ? colors.primary : colors.mutedForeground }]}
                numberOfLines={1}
              >
                Settings
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.recordBtnWrap,
          {
            position: 'absolute',
            left: centerX - recordBtnWrapWidth / 2,
            bottom: barContentHeight - recordBtnWrapWidth / 2,
            width: recordBtnWrapWidth,
            height: recordBtnWrapWidth,
            zIndex: 10,
            ...(Platform.OS === 'android' && { elevation: 20 }),
          },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={({ pressed }) => [
            styles.recordBtn,
            {
              backgroundColor: isRecordActive ? '#818CF8' : colors.background,
              borderWidth: 3,
              borderColor: isRecordActive ? colors.card : colors.mutedForeground,
            },
            isRecordActive && styles.recordBtnActive,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => onPress(1)}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Record tab"
        >
          <Ionicons
            name="mic"
            size={28}
            color={isRecordActive ? '#fff' : colors.mutedForeground}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    overflow: 'visible',
  },
  cutout: {
    position: 'absolute',
    top: -CUTOUT_R,
    width: CUTOUT_R * 2,
    height: CUTOUT_R * 2,
    borderRadius: CUTOUT_R,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 52,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    alignSelf: 'center',
  },
  centerSpacer: {
    width: BTN_SIZE + 32,
  },
  recordBtnWrap: {
    position: 'absolute',
    width: BTN_SIZE + 8,
    height: BTN_SIZE + 8,
    borderRadius: (BTN_SIZE + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },
  recordBtnActive: {
    ...Platform.select({
      ios: { shadowOpacity: 0.5, shadowRadius: 14 },
      android: { elevation: 14 },
    }),
  },
});

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Recordings' }} />
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
