import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

export function useAudioPlayback(audioUri: string | null) {
  const player = useAudioPlayer(audioUri ?? undefined);
  const status = useAudioPlayerStatus(player);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const wordsRef = useRef<{ start: number; end: number }[]>([]);

  // Configure audio session for playback through speaker
  useEffect(() => {
    if (audioUri) {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
  }, [audioUri]);

  const play = useCallback(async () => {
    // Re-assert playback mode before each play — handles BT disconnect scenarios
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    player.play();
  }, [player]);

  const pause = useCallback(() => player.pause(), [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      const clamped = Math.max(0, Math.min(seconds, status.duration ?? 0));
      player.seekTo(clamped);
    },
    [player, status.duration],
  );

  const skipForward = useCallback(
    (secs = 15) => seekTo((status.currentTime ?? 0) + secs),
    [seekTo, status.currentTime],
  );

  const skipBackward = useCallback(
    (secs = 15) => seekTo((status.currentTime ?? 0) - secs),
    [seekTo, status.currentTime],
  );

  const setWords = useCallback((words: { start: number; end: number }[]) => {
    wordsRef.current = words;
  }, []);

  // Sync word highlighting with playback position
  useEffect(() => {
    if (!status.playing || wordsRef.current.length === 0) {
      if (!status.playing) setCurrentWordIndex(-1);
      return;
    }
    const pos = status.currentTime;
    const idx = wordsRef.current.findIndex((w) => pos >= w.start && pos <= w.end);
    setCurrentWordIndex(idx);
  }, [status.playing, status.currentTime]);

  return {
    play,
    pause,
    seekTo,
    skipForward,
    skipBackward,
    setWords,
    currentWordIndex,
    isPlaying: status.playing,
    isLoaded: player.isLoaded,
    duration: status.duration ?? 0,
    position: status.currentTime ?? 0,
  };
}
