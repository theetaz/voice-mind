import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, Dimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAudioPlayback } from '@/hooks/use-audio-player';
import { useTheme } from '@/lib/theme-context';
import { formatDuration, formatTimestamp, STORAGE_BUCKET } from '@voicemind/shared';
import type { Recording, Transcript, Summary } from '@voicemind/shared';

// ── Playback Waveform ──
const BAR_COUNT = 50;
const BAR_GAP = 1.5;
const WAVEFORM_HEIGHT = 56;

const PlaybackBar = ({
  index,
  barWidth,
  height,
  progress,
  activeColor,
  inactiveColor,
}: {
  index: number;
  barWidth: number;
  height: number;
  progress: { value: number };
  activeColor: string;
  inactiveColor: string;
}) => {
  const style = useAnimatedStyle(() => ({
    width: barWidth,
    height,
    borderRadius: barWidth / 2,
    backgroundColor: index / BAR_COUNT <= progress.value ? activeColor : inactiveColor,
    transform: [{ translateY: (WAVEFORM_HEIGHT - height) / 2 }],
  }));
  return <Animated.View style={style} />;
};

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(0);

  const {
    play, pause, seekTo, skipForward, skipBackward,
    isPlaying, isLoaded, duration, position,
    currentWordIndex, setWords,
  } = useAudioPlayback(audioUrl);

  // Keep shared value in sync with playback position
  useEffect(() => {
    progress.value = duration > 0 ? position / duration : 0;
  }, [position, duration, progress]);

  const loadData = useCallback(async () => {
    const [recRes, transRes, sumRes] = await Promise.all([
      supabase.from('recordings').select('*').eq('id', id).single(),
      supabase.from('transcripts').select('*').eq('recording_id', id).eq('is_final', true).single(),
      supabase.from('summaries').select('*').eq('recording_id', id).single(),
    ]);

    if (recRes.data) {
      setRecording(recRes.data);
      setTitleDraft(recRes.data.title);
      if (recRes.data.audio_path) {
        const { data: urlData } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(recRes.data.audio_path, 3600);
        if (urlData?.signedUrl) setAudioUrl(urlData.signedUrl);
      }
    }
    if (transRes.data) {
      setTranscript(transRes.data);
      setWords(transRes.data.words ?? []);
    }
    if (sumRes.data) setSummary(sumRes.data);
    setLoading(false);
  }, [id, setWords]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (recording?.status === 'processing') {
      pollRef.current = setInterval(async () => {
        const { data } = await supabase.from('recordings').select('status').eq('id', id).single();
        if (data && data.status !== 'processing') {
          if (pollRef.current) clearInterval(pollRef.current);
          loadData();
        }
      }, 4000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [recording?.status, id, loadData]);

  const saveTitle = useCallback(async () => {
    setEditingTitle(false);
    if (!titleDraft.trim() || titleDraft === recording?.title) return;
    const { error } = await supabase.from('recordings').update({ title: titleDraft.trim() }).eq('id', id);
    if (error) {
      Alert.alert('Error', error.message);
      setTitleDraft(recording?.title ?? '');
    } else {
      setRecording((prev) => (prev ? { ...prev, title: titleDraft.trim() } : prev));
    }
  }, [titleDraft, recording?.title, id]);

  const retryProcessing = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('transcription_enabled, summarization_enabled').eq('id', user.id).single();
    const transcriptionEnabled = profile?.transcription_enabled !== false;
    const summarizationEnabled = profile?.summarization_enabled !== false;

    await supabase.from('recordings').update({ status: 'processing' }).eq('id', id);
    setRecording((prev) => (prev ? { ...prev, status: 'processing' } : prev));
    try {
      if (!transcriptionEnabled) {
        await supabase.from('recordings').update({ status: 'ready' }).eq('id', id);
        setRecording((prev) => (prev ? { ...prev, status: 'ready' } : prev));
        return;
      }
      const { error: tErr } = await supabase.functions.invoke('transcribe', { body: { recordingId: id } });
      if (!tErr && summarizationEnabled) {
        await supabase.functions.invoke('summarize', { body: { recordingId: id } });
      }
    } catch {
      await supabase.from('recordings').update({ status: 'failed' }).eq('id', id);
      setRecording((prev) => (prev ? { ...prev, status: 'failed' } : prev));
    }
  }, [id]);

  // Generate pseudo-random waveform heights seeded by recording id
  const waveformHeights = useMemo(() => {
    const seed = id ? id.charCodeAt(0) + id.charCodeAt(id.length - 1) : 42;
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const x = (i * 7 + seed) * 0.1;
      return 0.12 + 0.88 * Math.abs(
        Math.sin(x * 1.1) * Math.cos(x * 0.7) * 0.6 +
        Math.sin(x * 2.3 + 1) * 0.25 +
        Math.cos(x * 0.4 + 2) * 0.15
      );
    });
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const cardPadding = 16 + 20; // mx-4 + p-5
  const availableWidth = screenWidth - cardPadding * 2;
  const barWidth = (availableWidth - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT;
  const highlightBg = isDark ? 'rgba(129,140,248,0.2)' : 'rgba(99,102,241,0.15)';

  return (
    <>
      <Stack.Screen
        options={{
          title: recording?.title ?? 'Recording',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.foreground },
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 32 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Title */}
        <View className="px-5 pt-4 pb-2">
          {editingTitle ? (
            <TextInput
              className="text-foreground font-bold text-xl"
              value={titleDraft}
              onChangeText={setTitleDraft}
              onBlur={saveTitle}
              onSubmitEditing={saveTitle}
              autoFocus
              returnKeyType="done"
            />
          ) : (
            <Pressable onPress={() => setEditingTitle(true)}>
              <Text className="text-foreground font-bold text-xl">{recording?.title}</Text>
              <Text className="text-muted-foreground text-xs mt-0.5">Tap to rename</Text>
            </Pressable>
          )}
        </View>

        {/* Audio Player Card */}
        <View className="mx-4 mt-2 bg-card rounded-3xl p-5 border border-border" style={{ borderCurve: 'continuous' }}>
          {/* Waveform */}
          <Pressable
            onPress={(e) => {
              if (!isLoaded || !duration) return;
              const x = e.nativeEvent.locationX;
              const frac = Math.max(0, Math.min(1, x / availableWidth));
              seekTo(frac * duration);
            }}
          >
            <View style={{ height: WAVEFORM_HEIGHT, flexDirection: 'row', alignItems: 'flex-start', gap: BAR_GAP, marginBottom: 12 }}>
              {waveformHeights.map((h, i) => (
                <PlaybackBar
                  key={i}
                  index={i}
                  barWidth={barWidth}
                  height={Math.max(4, h * WAVEFORM_HEIGHT)}
                  progress={progress}
                  activeColor={colors.primary}
                  inactiveColor={colors.muted}
                />
              ))}
            </View>
          </Pressable>

          {/* Seek slider */}
          <Slider
            style={{ width: '100%', height: 32 }}
            minimumValue={0}
            maximumValue={duration || 1}
            value={position}
            onSlidingComplete={(val) => seekTo(val)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />

          {/* Time labels */}
          <View className="flex-row justify-between px-1 mb-5">
            <Text className="text-muted-foreground text-xs" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTimestamp(position)}
            </Text>
            <Text className="text-muted-foreground text-xs" style={{ fontVariant: ['tabular-nums'] }}>
              {formatDuration(duration || recording?.duration_seconds || 0)}
            </Text>
          </View>

          {/* Transport controls */}
          <View className="flex-row items-center justify-center gap-8">
            <Pressable onPress={() => skipBackward(15)} className="p-2">
              <Image source="sf:gobackward.15" style={{ width: 28, height: 28 }} tintColor={colors.mutedForeground} />
            </Pressable>
            <Pressable
              className="w-16 h-16 rounded-full bg-primary items-center justify-center"
              onPress={isPlaying ? pause : play}
              disabled={!isLoaded && !audioUrl}
            >
              {isPlaying ? (
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                  <View style={{ width: 5, height: 22, borderRadius: 2, backgroundColor: colors.primaryForeground }} />
                  <View style={{ width: 5, height: 22, borderRadius: 2, backgroundColor: colors.primaryForeground }} />
                </View>
              ) : (
                <View
                  style={{
                    width: 0, height: 0, marginLeft: 4,
                    borderLeftWidth: 18, borderLeftColor: colors.primaryForeground,
                    borderTopWidth: 12, borderTopColor: 'transparent',
                    borderBottomWidth: 12, borderBottomColor: 'transparent',
                  }}
                />
              )}
            </Pressable>
            <Pressable onPress={() => skipForward(15)} className="p-2">
              <Image source="sf:goforward.15" style={{ width: 28, height: 28 }} tintColor={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Processing banner */}
        {recording?.status === 'processing' ? (
          <View
            className="mx-4 mt-4 bg-yellow-50 dark:bg-yellow-950 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800 flex-row items-center gap-3"
            style={{ borderCurve: 'continuous' }}
          >
            <ActivityIndicator size="small" color={isDark ? '#FACC15' : '#EAB308'} />
            <Text className="text-yellow-700 dark:text-yellow-400 text-sm flex-1">
              Transcribing and summarizing...
            </Text>
          </View>
        ) : null}

        {/* Failed banner */}
        {recording?.status === 'failed' ? (
          <View
            className="mx-4 mt-4 bg-red-50 dark:bg-red-950 rounded-2xl p-4 border border-red-200 dark:border-red-800 flex-row items-center justify-between"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-red-700 dark:text-red-400 text-sm">Processing failed</Text>
            <Pressable className="bg-primary px-4 py-1.5 rounded-full" onPress={retryProcessing}>
              <Text className="text-primary-foreground font-semibold text-xs">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Transcript */}
        {transcript ? (
          <View className="mx-4 mt-4 bg-card rounded-2xl p-5 border border-border" style={{ borderCurve: 'continuous' }}>
            <Text className="text-foreground font-semibold text-base mb-3">Transcript</Text>
            <Text className="text-foreground text-base leading-7" selectable>
              {transcript.words.length > 0
                ? transcript.words.map((w, i) => (
                    <Text
                      key={i}
                      style={
                        i === currentWordIndex
                          ? { backgroundColor: highlightBg, color: colors.primary, fontWeight: '600' }
                          : undefined
                      }
                      onPress={() => seekTo(w.start)}
                    >
                      {w.word}{' '}
                    </Text>
                  ))
                : transcript.full_text || 'No transcript available.'}
            </Text>
          </View>
        ) : null}

        {/* Summary toggle */}
        {summary ? (
          <View className="mx-4 mt-4 bg-card rounded-2xl border border-border overflow-hidden" style={{ borderCurve: 'continuous' }}>
            <Pressable
              className="flex-row items-center justify-between p-5"
              onPress={() => setShowSummary(!showSummary)}
            >
              <Text className="text-foreground font-semibold text-base">Summary</Text>
              <Image
                source={`sf:chevron.${showSummary ? 'up' : 'down'}`}
                style={{ width: 14, height: 14 }}
                tintColor={colors.mutedForeground}
              />
            </Pressable>
            {showSummary ? (
              <View className="px-5 pb-5">
                <Text className="text-foreground text-base leading-7 mb-3" selectable>
                  {summary.content}
                </Text>
                {summary.key_points.length > 0 ? (
                  <>
                    <Text className="text-foreground font-semibold text-sm mb-2">Key Points</Text>
                    {summary.key_points.map((point, i) => (
                      <Text key={i} className="text-muted-foreground text-sm mb-1.5 leading-5" selectable>
                        {'\u2022  '}{point}
                      </Text>
                    ))}
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* No content yet */}
        {!transcript && !summary && recording?.status !== 'processing' && recording?.status !== 'failed' ? (
          <View className="mx-4 mt-4 bg-card rounded-2xl p-5 border border-border items-center" style={{ borderCurve: 'continuous' }}>
            <Text className="text-muted-foreground text-sm">No transcript or summary available yet.</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
