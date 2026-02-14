import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { formatDuration } from '@voicemind/shared';

export default function RecordScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setIsRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      // TODO: Initialize expo-audio recording + LiveKit connection
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // TODO: Stop recording, upload audio to Supabase Storage
      // Create recording entry in DB
      const { data, error } = await supabase
        .from('recordings')
        .insert({
          user_id: user?.id,
          title: `Recording ${new Date().toLocaleDateString()}`,
          duration_seconds: duration,
          status: 'processing',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/recording/${data.id}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, [user, duration, router]);

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <Text
        className="text-6xl font-light text-foreground mb-16"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {formatDuration(duration)}
      </Text>

      <Pressable
        className={`w-20 h-20 rounded-full items-center justify-center ${
          isRecording ? 'bg-destructive' : 'bg-primary'
        }`}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <View
          className={isRecording ? 'w-7 h-7 rounded-sm bg-white' : 'w-7 h-7 rounded-full bg-white'}
        />
      </Pressable>

      <Text className="text-muted-foreground text-sm mt-6">
        {isRecording ? 'Tap to stop' : 'Tap to start recording'}
      </Text>
    </View>
  );
}
