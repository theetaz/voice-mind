import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAudioPlayback } from '@/hooks/use-audio-player';
import { formatDuration, formatTimestamp } from '@voicemind/shared';
import type { Recording, Transcript, Summary } from '@voicemind/shared';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const { play, pause, seekTo, isPlaying, duration, position, currentWordIndex, setWords } =
    useAudioPlayback(recording?.audio_path ?? null);

  useEffect(() => {
    async function load() {
      const [recRes, transRes, sumRes] = await Promise.all([
        supabase.from('recordings').select('*').eq('id', id).single(),
        supabase
          .from('transcripts')
          .select('*')
          .eq('recording_id', id)
          .eq('is_final', true)
          .single(),
        supabase.from('summaries').select('*').eq('recording_id', id).single(),
      ]);

      if (recRes.data) setRecording(recRes.data);
      if (transRes.data) {
        setTranscript(transRes.data);
        setWords(transRes.data.words ?? []);
      }
      if (sumRes.data) setSummary(sumRes.data);
      setLoading(false);
    }
    load();
  }, [id, setWords]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: recording?.title ?? 'Recording' }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Player Controls */}
        <View
          className="bg-card rounded-2xl p-5 border border-border items-center"
          style={{ borderCurve: 'continuous' }}
        >
          <Text
            className="text-3xl font-light text-foreground mb-4"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {formatTimestamp(position ?? 0)} / {formatDuration(recording?.duration_seconds ?? 0)}
          </Text>
          <Pressable
            className="w-16 h-16 rounded-full bg-primary items-center justify-center"
            onPress={isPlaying ? pause : play}
          >
            <Image
              source={`sf:${isPlaying ? 'pause.fill' : 'play.fill'}`}
              style={{ width: 24, height: 24 }}
              tintColor="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* Transcript */}
        {transcript && (
          <View
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-foreground font-semibold text-lg mb-3">Transcript</Text>
            <Text className="text-foreground text-base leading-7" selectable>
              {transcript.words.length > 0
                ? transcript.words.map((w, i) => (
                    <Text
                      key={i}
                      className={i === currentWordIndex ? 'bg-primary/20 text-primary' : ''}
                      onPress={() => seekTo(w.start)}
                    >
                      {w.word}{' '}
                    </Text>
                  ))
                : transcript.full_text}
            </Text>
          </View>
        )}

        {/* Summary */}
        {summary && (
          <View
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-foreground font-semibold text-lg mb-3">Summary</Text>
            <Text className="text-foreground text-base leading-7 mb-4" selectable>
              {summary.content}
            </Text>
            {summary.key_points.length > 0 && (
              <>
                <Text className="text-foreground font-semibold text-sm mb-2">Key Points</Text>
                {summary.key_points.map((point, i) => (
                  <Text key={i} className="text-muted-foreground text-sm mb-1" selectable>
                    {'  \u2022  '}
                    {point}
                  </Text>
                ))}
              </>
            )}
          </View>
        )}

        {/* Status */}
        {recording?.status === 'processing' && (
          <View className="bg-yellow-50 rounded-2xl p-5 border border-yellow-200 items-center">
            <ActivityIndicator size="small" color="#EAB308" />
            <Text className="text-yellow-700 text-sm mt-2">
              Transcription and summary in progress...
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
