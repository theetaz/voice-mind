import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Image } from 'expo-image';
import { formatDuration, getAudioStoragePath, STORAGE_BUCKET } from '@voicemind/shared';

export default function RecordScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { start, stop, isRecording, durationSeconds } = useRecorder();
  const live = useLiveTranscription();
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const startRecording = useCallback(async () => {
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const started = await start();
      if (!started) return;
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

      live.stopListening();
      const { uri, durationSeconds: dur } = await stop();

      if (!uri) {
        Alert.alert('Error', 'No audio file was recorded.');
        setSaving(false);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileSize = Math.round((base64.length * 3) / 4);

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

      const storagePath = getAudioStoragePath(user.id, recording.id);
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, decode(base64), { contentType: 'audio/m4a', upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from('recordings').update({ audio_path: storagePath }).eq('id', recording.id);

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
      const errMsg = [e?.message, e?.details].filter(Boolean).join(' ');
      const isFkViolation = e?.code === '23503' && /users|user_id/.test(errMsg);
      if (isFkViolation) {
        await signOut();
        Alert.alert(
          'Session expired',
          'Your account may have been reset or you\'re connected to a different server. Please sign in again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', e?.message ?? 'Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  }, [user, stop, router, live, signOut]);

  const displayText = live.interimText
    ? live.transcript
      ? `${live.transcript} ${live.interimText}`
      : live.interimText
    : live.transcript;

  const statusText = saving ? 'Saving...' : isRecording ? 'Recording...' : 'Ready';

  return (
    <View className="flex-1 bg-background px-6 pb-12" style={{ paddingTop: insets.top + 24 }}>
      <Text className="text-foreground font-semibold text-center mb-4" style={{ fontSize: 22 }}>
        {isRecording || saving ? 'Active Recording' : 'Record'}
      </Text>

      <View className="items-center flex-1 justify-center">
        <Text
          className="text-foreground font-extralight"
          style={{ fontVariant: ['tabular-nums'], fontSize: 56 }}
        >
          {formatDuration(durationSeconds)}
        </Text>
        <View className="flex-row items-center mt-2 gap-2">
          {isRecording && (
            <View className="w-2.5 h-2.5 rounded-full bg-destructive" />
          )}
          <Text className="text-muted-foreground" style={{ fontSize: 16 }}>{statusText}</Text>
        </View>

        <View className="w-full items-center my-8">
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
        </View>

        {(displayText || (isRecording && !displayText)) ? (
          <ScrollView
            ref={scrollRef}
            className="w-full max-h-36 bg-card rounded-2xl p-4 border border-border"
            style={{ borderCurve: 'continuous' }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            <Text className="text-foreground leading-6" style={{ fontSize: 16 }}>
              {live.transcript ? <Text>{live.transcript} </Text> : null}
              {live.interimText ? (
                <Text className="text-muted-foreground">{live.interimText}</Text>
              ) : null}
            </Text>
            {isRecording && !displayText && (
              <Text className="text-muted-foreground" style={{ fontSize: 16 }}>Listening...</Text>
            )}
          </ScrollView>
        ) : (
          <View
            className="w-full h-24 bg-card rounded-2xl border border-dashed border-border items-center justify-center"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-muted-foreground" style={{ fontSize: 15 }}>Audio visualization will appear here</Text>
          </View>
        )}
      </View>

      <View className="items-center mt-6">
        <View className="flex-row items-center justify-center gap-6">
          <Pressable className="w-12 h-12 rounded-full bg-muted items-center justify-center opacity-50">
            <Image source="sf:pause.fill" style={{ width: 20, height: 20 }} tintColor={colors.mutedForeground} />
          </Pressable>

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

          <Pressable className="w-12 h-12 rounded-full bg-muted items-center justify-center opacity-50">
            <Image source="sf:bookmark" style={{ width: 20, height: 20 }} tintColor={colors.mutedForeground} />
          </Pressable>
        </View>
        <Text className="text-muted-foreground mt-4" style={{ fontSize: 15 }}>
          {saving ? 'Saving...' : isRecording ? 'Tap the center button to finish & save' : 'Tap to record'}
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
