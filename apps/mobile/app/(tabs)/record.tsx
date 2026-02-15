import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRecorder } from '@/hooks/use-recorder';
import { useLiveTranscription } from '@/hooks/use-live-transcription';
import { useTheme } from '@/lib/theme-context';
import { LiveWaveform } from '@/components/LiveWaveform';
import { formatDuration, getAudioStoragePath, STORAGE_BUCKET } from '@voicemind/shared';

export default function RecordScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { start, stop, isRecording, durationSeconds } = useRecorder();
  const live = useLiveTranscription();
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const startRecording = useCallback(async () => {
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      // Start audio recorder first (sets audio session)
      const started = await start();
      if (!started) return;
      // Start live transcription + volume metering alongside
      await live.startListening();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [start, live]);

  const stopRecording = useCallback(async () => {
    if (!user) return;
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setSaving(true);

      // Stop both systems
      live.stopListening();
      const { uri, durationSeconds: dur } = await stop();

      if (!uri) {
        Alert.alert('Error', 'No audio file was recorded.');
        setSaving(false);
        return;
      }

      // Read audio as base64 for upload
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileSize = Math.round((base64.length * 3) / 4);

      // Create recording entry
      const { data: recording, error: insertError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          title: `Recording ${new Date().toLocaleDateString()}`,
          duration_seconds: dur,
          status: 'processing',
          file_size_bytes: fileSize,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!recording) throw new Error('Failed to create recording');

      // Upload M4A to storage
      const storagePath = getAudioStoragePath(user.id, recording.id);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, decode(base64), { contentType: 'audio/m4a', upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from('recordings').update({ audio_path: storagePath }).eq('id', recording.id);

      // Store live transcript as draft (Whisper will replace it)
      const liveText = live.getFullTranscript();
      if (liveText) {
        await supabase.from('transcripts').insert({
          recording_id: recording.id,
          full_text: liveText,
          words: [],
          provider: 'speech-recognition',
          is_final: false,
        });
      }

      router.push(`/recording/${recording.id}`);
      triggerProcessing(recording.id);
    } catch (e: any) {
      console.error('Stop recording error:', e);
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }, [user, stop, router, live]);

  // Combine finals + interim for display
  const displayText = live.interimText
    ? live.transcript
      ? `${live.transcript} ${live.interimText}`
      : live.interimText
    : live.transcript;

  return (
    <View className="flex-1 bg-background items-center justify-between px-6 pb-12 pt-8">
      {/* Timer */}
      <View className="items-center">
        <Text
          className="text-5xl font-extralight text-foreground"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {formatDuration(durationSeconds)}
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">
          {saving ? 'Saving...' : isRecording ? 'Recording' : 'Ready'}
        </Text>
      </View>

      {/* Waveform + Transcript area */}
      <View className="flex-1 w-full items-center justify-center gap-5 my-6">
        {/* Waveform */}
        <LiveWaveform
          active={isRecording}
          processing={saving}
          volume={live.volume}
          barCount={40}
          barWidth={3}
          height={80}
          barColor={colors.primary}
          barColorMuted={colors.muted}
        />

        {/* Live transcript */}
        {displayText ? (
          <ScrollView
            ref={scrollRef}
            className="max-h-40 w-full bg-card rounded-2xl p-4 border border-border"
            style={{ borderCurve: 'continuous' }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <Text className="text-foreground text-sm leading-6">
              {live.transcript ? (
                <Text>{live.transcript} </Text>
              ) : null}
              {live.interimText ? (
                <Text className="text-muted-foreground">{live.interimText}</Text>
              ) : null}
            </Text>
          </ScrollView>
        ) : isRecording ? (
          <View
            className="w-full bg-card rounded-2xl p-4 border border-border items-center"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-muted-foreground text-sm">Listening...</Text>
          </View>
        ) : null}
      </View>

      {/* Record button */}
      <View className="items-center">
        {saving ? (
          <View className="w-20 h-20 rounded-full bg-muted items-center justify-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <Pressable
            className={`w-20 h-20 rounded-full items-center justify-center ${
              isRecording ? 'bg-destructive' : 'bg-primary'
            }`}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <View
              className={
                isRecording
                  ? 'w-7 h-7 rounded-sm bg-white'
                  : 'w-7 h-7 rounded-full bg-white'
              }
            />
          </Pressable>
        )}
        <Text className="text-muted-foreground text-sm mt-4">
          {saving ? 'Saving recording...' : isRecording ? 'Tap to stop' : 'Tap to record'}
        </Text>
      </View>
    </View>
  );
}

async function triggerProcessing(recordingId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('transcription_enabled, summarization_enabled')
      .eq('id', user.id)
      .single();
    const transcriptionEnabled = profile?.transcription_enabled !== false;
    const summarizationEnabled = profile?.summarization_enabled !== false;

    if (!transcriptionEnabled) {
      await supabase.from('recordings').update({ status: 'ready' }).eq('id', recordingId);
      return;
    }

    const { error: tErr } = await supabase.functions.invoke('transcribe', {
      body: { recordingId },
    });
    if (tErr) {
      console.warn('Transcription failed:', tErr.message);
      throw tErr;
    }

    if (summarizationEnabled) {
      await supabase.functions.invoke('summarize', { body: { recordingId } });
    }
  } catch {
    await supabase.from('recordings').update({ status: 'failed' }).eq('id', recordingId);
  }
}
