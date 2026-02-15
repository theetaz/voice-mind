import { useCallback, useState, useEffect } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

export function useRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 500);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      setPermissionGranted(status.granted);
    });
  }, []);

  const start = useCallback(async () => {
    if (!permissionGranted) {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission Required', 'Microphone access is needed to record.');
        return false;
      }
      setPermissionGranted(true);
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [permissionGranted, recorder]);

  const stop = useCallback(async (): Promise<{ uri: string | null; durationSeconds: number }> => {
    const durationSec = Math.round(state.durationMillis / 1000);
    await recorder.stop();
    // Reset to playback mode — ensures audio routes to speaker after BT disconnect
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

    // Get URI — try recorder.uri first, fall back to state.url
    const uri = recorder.uri ?? state.url ?? null;

    // Verify the file exists and has data
    if (uri) {
      const info = await FileSystem.getInfoAsync(uri);
      console.log('[Recorder] File info:', JSON.stringify(info));
      if (!info.exists) {
        console.warn('[Recorder] File does not exist at:', uri);
        return { uri: null, durationSeconds: durationSec };
      }
    }

    return { uri, durationSeconds: durationSec };
  }, [recorder, state.durationMillis, state.url]);

  return {
    start,
    stop,
    isRecording: state.isRecording,
    durationSeconds: Math.round(state.durationMillis / 1000),
    permissionGranted,
  };
}
