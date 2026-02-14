import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useRecordings } from '@/hooks/use-recordings';
import { formatDuration, formatRelativeDate } from '@voicemind/shared';

export default function RecordingsScreen() {
  const { recordings, loading, refresh, deleteRecording } = useRecordings();
  const router = useRouter();

  const confirmDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Recording', `Are you sure you want to delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRecording(id),
        },
      ]);
    },
    [deleteRecording],
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
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
            <Text className="text-muted-foreground text-sm mt-1">
              Tap Record to get started
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            className="bg-card rounded-2xl p-4 border border-border"
            style={{ borderCurve: 'continuous' }}
            onPress={() => router.push(`/recording/${item.id}`)}
            onLongPress={() => confirmDelete(item.id, item.title)}
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
              <View
                className={`px-2 py-0.5 rounded-full ${
                  item.status === 'ready'
                    ? 'bg-green-100'
                    : item.status === 'processing'
                      ? 'bg-yellow-100'
                      : item.status === 'failed'
                        ? 'bg-red-100'
                        : 'bg-blue-100'
                }`}
              >
                <Text
                  className={`text-xs font-medium capitalize ${
                    item.status === 'ready'
                      ? 'text-green-700'
                      : item.status === 'processing'
                        ? 'text-yellow-700'
                        : item.status === 'failed'
                          ? 'text-red-700'
                          : 'text-blue-700'
                  }`}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
