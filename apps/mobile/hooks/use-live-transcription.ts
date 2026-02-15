import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useSharedValue } from 'react-native-reanimated';

/** Normalize raw volume (-2..10) to 0..1 */
function normalizeVolume(raw: number): number {
  'worklet';
  return Math.max(0, Math.min(1, (raw + 2) / 12));
}

export function useLiveTranscription() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const volume = useSharedValue(0);
  const finalsRef = useRef('');

  // --- events ---
  useSpeechRecognitionEvent('start', () => setIsListening(true));

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    volume.value = 0;
  });

  useSpeechRecognitionEvent('result', (ev) => {
    const result = ev.results[ev.resultIndex ?? 0];
    if (!result) return;
    if (result.isFinal) {
      finalsRef.current = finalsRef.current
        ? `${finalsRef.current} ${result.transcript}`
        : result.transcript;
      setTranscript(finalsRef.current);
      setInterimText('');
    } else {
      setInterimText(result.transcript);
    }
  });

  useSpeechRecognitionEvent('volumechange', (ev) => {
    volume.value = normalizeVolume(ev.value);
  });

  useSpeechRecognitionEvent('error', (ev) => {
    console.warn('[SpeechRec] error:', ev.error, ev.message);
    setIsListening(false);
    volume.value = 0;
  });

  // --- controls ---
  const startListening = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      console.warn('[SpeechRec] permissions not granted');
      return;
    }
    finalsRef.current = '';
    setTranscript('');
    setInterimText('');

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      iosCategory: {
        category: 'playAndRecord',
        categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
        mode: 'measurement',
      },
    });
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const getFullTranscript = useCallback(() => finalsRef.current, []);

  return {
    startListening,
    stopListening,
    isListening,
    transcript,
    interimText,
    volume,
    getFullTranscript,
  };
}
