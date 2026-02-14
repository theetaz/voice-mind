import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/use-auth';
import { APP_NAME } from '@voicemind/shared';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      contentInsetAdjustmentBehavior="automatic"
    >
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
            <Text className="text-foreground font-semibold text-base">
              {user?.user_metadata?.full_name ?? 'User'}
            </Text>
            <Text className="text-muted-foreground text-sm">{user?.email}</Text>
          </View>
        </View>
      </View>

      <View
        className="bg-card rounded-2xl border border-border overflow-hidden"
        style={{ borderCurve: 'continuous' }}
      >
        <SettingsRow label="App Version" value="1.0.0" />
        <SettingsRow label="Audio Quality" value="High" />
        <SettingsRow label="Transcription" value="Auto" />
      </View>

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

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-border last:border-b-0">
      <Text className="text-foreground text-base">{label}</Text>
      <Text className="text-muted-foreground text-base">{value}</Text>
    </View>
  );
}
