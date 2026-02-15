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

/** Wait until a file at `uri` stabilizes in size (encoder flush complete). */
async function waitForFileStable(uri: string, maxWaitMs = 2000): Promise<void> {
  let prevSize = -1;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) break;
    const size = (info as any).size ?? 0;
    if (size > 0 && size === prevSize) return; // stable
    prevSize = size;
    await new Promise((r) => setTimeout(r, 150));
  }
}

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

    // Reset to playback mode
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

    const uri = recorder.uri ?? state.url ?? null;

    if (uri) {
      // Wait for the encoder to fully flush audio data to disk
      await waitForFileStable(uri);

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
