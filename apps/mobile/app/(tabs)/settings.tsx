import { useState, useCallback, memo } from 'react';
import { View, Text, Pressable, Alert, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { APP_NAME } from '@voicemind/shared';

type ThemeMode = 'light' | 'dark' | 'system';
const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sun.max.fill' },
  { value: 'dark', label: 'Dark', icon: 'moon.fill' },
  { value: 'system', label: 'System', icon: 'gearshape.fill' },
];

const SettingsRow = memo(function SettingsRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-border last:border-b-0">
      <Text className="text-foreground text-base">{label}</Text>
      <Text className="text-muted-foreground text-base">{value}</Text>
    </View>
  );
});

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { mode, setTheme, colors } = useTheme();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User',
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const saveDisplayName = useCallback(async () => {
    setEditingName(false);
    if (!displayName.trim()) return;
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user?.id);
    if (error) Alert.alert('Error', error.message);
  }, [displayName, user?.id]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Profile Card */}
      <View
        className="bg-card rounded-2xl p-4 border border-border"
        style={{ borderCurve: 'continuous' }}
      >
        <View className="flex-row items-center gap-4">
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
              <Text className="text-primary-foreground text-lg font-bold">
                {(user?.email?.[0] ?? 'U').toUpperCase()}
              </Text>
            </View>
          )}
          <View className="flex-1">
            {editingName ? (
              <TextInput
                className="text-foreground font-semibold text-base"
                value={displayName}
                onChangeText={setDisplayName}
                onBlur={saveDisplayName}
                onSubmitEditing={saveDisplayName}
                autoFocus
                returnKeyType="done"
              />
            ) : (
              <Pressable onPress={() => setEditingName(true)}>
                <Text className="text-foreground font-semibold text-base">{displayName}</Text>
                <Text className="text-muted-foreground text-xs">Tap to edit name</Text>
              </Pressable>
            )}
            <Text className="text-muted-foreground text-sm mt-0.5">{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Appearance */}
      <View
        className="bg-card rounded-2xl border border-border overflow-hidden"
        style={{ borderCurve: 'continuous' }}
      >
        <Text className="text-foreground font-semibold text-sm px-4 pt-4 pb-2">Appearance</Text>
        <View className="flex-row mx-3 mb-3 bg-muted rounded-xl p-1">
          {THEME_OPTIONS.map((opt) => {
            const active = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-lg ${
                  active ? 'bg-card' : ''
                }`}
                style={active ? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 } : undefined}
                onPress={() => setTheme(opt.value)}
              >
                <Image
                  source={`sf:${opt.icon}`}
                  style={{ width: 16, height: 16 }}
                  tintColor={active ? colors.primary : colors.mutedForeground}
                />
                <Text
                  className={`text-sm font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* App Info */}
      <View
        className="bg-card rounded-2xl border border-border overflow-hidden"
        style={{ borderCurve: 'continuous' }}
      >
        <SettingsRow label="App Version" value="1.0.0" />
        <SettingsRow label="Audio Quality" value="High" />
        <SettingsRow label="Transcription" value="Auto" />
      </View>

      {/* Sign Out */}
      <Pressable
        className="bg-card rounded-2xl p-4 border border-border items-center"
        style={{ borderCurve: 'continuous' }}
        onPress={handleSignOut}
      >
        <Text className="text-destructive font-semibold text-base">Sign Out</Text>
      </Pressable>

      <Text className="text-muted-foreground text-xs text-center mt-4">
        {APP_NAME} v1.0.0
      </Text>
    </ScrollView>
  );
}
