import { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRecorder } from '@/hooks/use-recorder';
import { useLivekitSession } from '@/hooks/use-livekit-session';
import { formatDuration, getAudioStoragePath, STORAGE_BUCKET } from '@voicemind/shared';

const LIVEKIT_ENABLED = !!process.env.EXPO_PUBLIC_LIVEKIT_URL;

export default function RecordScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { start, stop, isRecording, durationSeconds } = useRecorder();
  const livekit = useLivekitSession();
  const [saving, setSaving] = useState(false);

  const startRecording = useCallback(async () => {
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const started = await start();
      if (!started) return;

      if (LIVEKIT_ENABLED) {
        const roomName = `recording-${Date.now()}`;
        livekit.connect(roomName).catch(console.error);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [start, livekit]);

  const stopRecording = useCallback(async () => {
    if (!user) return;
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setSaving(true);

      if (livekit.connected) {
        await livekit.disconnect();
      }

      const { uri, durationSeconds: dur } = await stop();

      if (!uri) {
        Alert.alert('Error', 'No audio file was recorded.');
        setSaving(false);
        return;
      }

      // Read audio file as base64 (the only reliable way in React Native)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileSize = Math.round((base64.length * 3) / 4); // approximate decoded size

      // Create recording entry to get the ID
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

      // Upload audio to Supabase Storage via ArrayBuffer decoded from base64
      const storagePath = getAudioStoragePath(user.id, recording.id);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, decode(base64), {
          contentType: 'audio/m4a',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update recording with audio_path
      await supabase
        .from('recordings')
        .update({ audio_path: storagePath })
        .eq('id', recording.id);

      // Store live transcript if we got one from LiveKit
      const liveText = livekit.getFullTranscript();
      if (liveText) {
        await supabase.from('transcripts').insert({
          recording_id: recording.id,
          full_text: liveText,
          words: [],
          provider: 'deepgram',
          is_final: false,
        });
      }
      livekit.clearTranscript();

      // Navigate to detail screen
      router.push(`/recording/${recording.id}`);

      // Trigger post-processing pipeline (fire-and-forget)
      triggerProcessing(recording.id);
    } catch (e: any) {
      console.error('Stop recording error:', e);
      Alert.alert('Error', e.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }, [user, stop, router, livekit]);

  const liveText = livekit.liveTranscript;
  const currentText = liveText.length > 0 ? liveText[liveText.length - 1].text : '';

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Text
        className="text-6xl font-light text-foreground mb-8"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatDuration(durationSeconds)}
      </Text>

      {isRecording && LIVEKIT_ENABLED && currentText ? (
        <ScrollView
          className="max-h-32 w-full mb-8 bg-card rounded-2xl p-4 border border-border"
          style={{ borderCurve: 'continuous' }}
        >
          <Text className="text-foreground text-sm leading-5">{currentText}</Text>
        </ScrollView>
      ) : (
        <View className="h-8 mb-8" />
      )}

      {saving ? (
        <View className="w-20 h-20 rounded-full bg-muted items-center justify-center">
          <ActivityIndicator color="#6366F1" />
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
              isRecording ? 'w-7 h-7 rounded-sm bg-white' : 'w-7 h-7 rounded-full bg-white'
            }
          />
        </Pressable>
      )}

      <Text className="text-muted-foreground text-sm mt-6">
        {saving ? 'Saving...' : isRecording ? 'Tap to stop' : 'Tap to start recording'}
      </Text>
    </View>
  );
}

async function triggerProcessing(recordingId: string) {
  try {
    const { error: tErr } = await supabase.functions.invoke('transcribe', {
      body: { recordingId },
    });
    if (tErr) {
      console.warn('Transcription failed:', tErr.message);
      throw tErr;
    }

    const { error: sErr } = await supabase.functions.invoke('summarize', {
      body: { recordingId },
    });
    if (sErr) console.warn('Summarization failed:', sErr.message);
  } catch {
    await supabase.from('recordings').update({ status: 'failed' }).eq('id', recordingId);
  }
}
