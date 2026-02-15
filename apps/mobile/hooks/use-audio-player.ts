import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

export function useAudioPlayback(audioUri: string | null) {
  const player = useAudioPlayer(audioUri ?? undefined);
  const status = useAudioPlayerStatus(player);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const wordsRef = useRef<{ start: number; end: number }[]>([]);
  const wasPlayingRef = useRef(false);

  // Configure audio session for playback through speaker
  useEffect(() => {
    if (audioUri) {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    }
  }, [audioUri]);

  // Track if we were playing — used to detect unexpected stops (BT disconnect)
  useEffect(() => {
    if (status.playing) {
      wasPlayingRef.current = true;
    } else if (wasPlayingRef.current && !status.playing) {
      // Audio stopped — could be BT disconnect or natural end
      wasPlayingRef.current = false;
    }
  }, [status.playing]);

  // When app comes back to foreground, re-assert audio mode
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && audioUri) {
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      }
    });
    return () => sub.remove();
  }, [audioUri]);

  const play = useCallback(async () => {
    // Force reconfigure audio session before every play.
    // This handles BT disconnect: iOS may have switched the route to
    // a non-existent output. Re-setting the mode forces iOS to pick
    // the best available output (built-in speaker).
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

    // If the player lost its source (e.g. after audio route change),
    // reload it by replacing the source.
    if (!player.playing && audioUri && !player.isLoaded) {
      player.replace({ uri: audioUri });
      // Small wait for source to load
      await new Promise((r) => setTimeout(r, 200));
    }

    player.play();
  }, [player, audioUri]);

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
