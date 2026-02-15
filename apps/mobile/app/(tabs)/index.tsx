import { useCallback, memo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRecordings } from '@/hooks/use-recordings';
import { useTheme } from '@/lib/theme-context';
import { formatDuration, formatRelativeDate } from '@voicemind/shared';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  ready: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400' },
  processing: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-400' },
  failed: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400' },
  default: { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-400' },
};

type RecordingItem = {
  id: string;
  title: string;
  duration_seconds: number;
  created_at: string;
  status: string;
};

const RecordingRow = memo(function RecordingRow({
  item,
  onPress,
  onLongPress,
}: {
  item: RecordingItem;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const s = STATUS_STYLES[item.status] ?? STATUS_STYLES.default;
  return (
    <Pressable
      className="bg-card rounded-2xl p-4 border border-border"
      style={{ borderCurve: 'continuous' }}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text className="text-foreground font-semibold text-base" numberOfLines={1}>
        {item.title}
      </Text>
      <View className="flex-row items-center mt-2 gap-3">
        <Text className="text-muted-foreground text-sm">
          {formatDuration(item.duration_seconds)}
        </Text>
        <Text className="text-muted-foreground text-sm">
          {formatRelativeDate(item.created_at)}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${s.bg}`}>
          <Text className={`text-xs font-medium capitalize ${s.text}`}>{item.status}</Text>
        </View>
      </View>
    </Pressable>
  );
});

export default function RecordingsScreen() {
  const { recordings, loading, refresh, deleteRecording } = useRecordings();
  const { colors } = useTheme();
  const router = useRouter();

  const confirmDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Recording', `Are you sure you want to delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(id) },
      ]);
    },
    [deleteRecording],
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        contentInsetAdjustmentBehavior="automatic"
        onRefresh={refresh}
        refreshing={loading}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-32">
            <Text className="text-muted-foreground text-base">No recordings yet</Text>
            <Text className="text-muted-foreground text-sm mt-1">Tap Record to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <RecordingRow
            item={item}
            onPress={() => router.push(`/recording/${item.id}`)}
            onLongPress={() => confirmDelete(item.id, item.title)}
          />
        )}
      />
    </View>
  );
}
