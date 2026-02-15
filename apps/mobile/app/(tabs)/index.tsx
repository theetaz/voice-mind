import { useCallback, memo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useRecordings, type RecordingWithMeta } from '@/hooks/use-recordings';
import { useTheme } from '@/lib/theme-context';
import { formatDuration, formatDateWithTime } from '@voicemind/shared';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  ready: { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400', label: 'READY' },
  processing: { bg: 'bg-yellow-100 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-400', label: 'PROCESSING' },
  failed: { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', label: 'FAILED' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'READY' },
};

const RecordingCard = memo(function RecordingCard({
  item,
  onPress,
  onLongPress,
  colors,
}: {
  item: RecordingWithMeta;
  onPress: () => void;
  onLongPress: () => void;
  colors: Record<string, string>;
}) {
  const isArchived = item.is_hidden === true;
  const s = isArchived
    ? { bg: 'bg-muted', text: 'text-muted-foreground', label: 'ARCHIVED' }
    : (STATUS_STYLES[item.status] ?? STATUS_STYLES.default);

  return (
    <Pressable
      className="bg-card rounded-2xl p-4 border border-border mb-3"
      style={{ borderCurve: 'continuous' }}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="text-foreground font-semibold flex-1" numberOfLines={1} style={{ fontSize: 17 }}>
          {item.title}
        </Text>
        <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
          <Text className={`font-semibold uppercase ${s.text}`} style={{ fontSize: 11 }}>{s.label}</Text>
        </View>
      </View>
      <Text className="text-muted-foreground mt-1.5" style={{ fontSize: 14 }}>
        {formatDateWithTime(item.created_at)}
      </Text>
      {item.transcript_snippet ? (
        <Text className="text-muted-foreground mt-2" numberOfLines={2} style={{ fontSize: 15 }}>
          "{item.transcript_snippet}..."
        </Text>
      ) : null}
      <View className="flex-row items-center gap-4 mt-3">
        <View className="flex-row items-center gap-1">
          <Image source="sf:clock" style={{ width: 14, height: 14 }} tintColor={colors.mutedForeground} />
          <Text className="text-muted-foreground" style={{ fontSize: 14 }}>{formatDuration(item.duration_seconds)}</Text>
        </View>
        {item.has_summary ? (
          <View className="flex-row items-center gap-1">
            <Image source="sf:doc.text" style={{ width: 14, height: 14 }} tintColor={colors.mutedForeground} />
            <Text className="text-muted-foreground" style={{ fontSize: 14 }}>Summary available</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

export default function RecordingsScreen() {
  const { recordings, loading, loadingMore, hasMore, refresh, loadMore, search, clearSearch, deleteRecording } = useRecordings();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const confirmDelete = useCallback(
    (id: string, title: string) => {
      Alert.alert('Delete Recording', `Are you sure you want to delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(id) },
      ]);
    },
    [deleteRecording],
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (!text.trim()) {
        clearSearch();
        return;
      }
      searchTimeoutRef.current = setTimeout(() => search(text), 400);
    },
    [search, clearSearch],
  );

  const handleEndReached = useCallback(() => {
    if (!loading && !loadingMore && hasMore) loadMore();
  }, [loadMore, loading, loadingMore, hasMore]);

  if (loading && recordings.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-4 pb-3">
        <Text className="text-foreground font-bold text-center py-4" style={{ fontSize: 20 }}>Recordings</Text>
        <View className="bg-card rounded-xl border border-border flex-row items-center px-3 py-2.5">
          <Image source="sf:magnifyingglass" style={{ width: 18, height: 18 }} tintColor={colors.mutedForeground} />
          <TextInput
            className="flex-1 ml-2 text-foreground"
            style={{ fontSize: 16 }}
            placeholder="Search recordings, transcripts..."
            placeholderTextColor={colors.mutedForeground}
            value={searchText}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>
      </View>

      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        contentInsetAdjustmentBehavior="automatic"
        onRefresh={refresh}
        refreshing={loading && recordings.length > 0}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-32">
            <Text className="text-muted-foreground" style={{ fontSize: 17 }}>No recordings yet</Text>
            <Text className="text-muted-foreground mt-1" style={{ fontSize: 15 }}>Tap Record to get started</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RecordingCard
            item={item}
            colors={colors}
            onPress={() => router.push(`/recording/${item.id}`)}
            onLongPress={() => confirmDelete(item.id, item.title)}
          />
        )}
      />
    </View>
  );
}
