import { useCallback, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export function useAudioPlayback(audioUri: string | null) {
  const player = useAudioPlayer(audioUri ?? undefined);
  const status = useAudioPlayerStatus(player);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const wordsRef = useRef<{ start: number; end: number }[]>([]);

  const play = useCallback(() => {
    player.play();
  }, [player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const seekTo = useCallback(
    (seconds: number) => {
      player.seekTo(seconds);
    },
    [player],
  );

  const setWords = useCallback((words: { start: number; end: number }[]) => {
    wordsRef.current = words;
  }, []);

  const updateHighlight = useCallback(
    (positionSeconds: number) => {
      const words = wordsRef.current;
      const idx = words.findIndex((w) => positionSeconds >= w.start && positionSeconds <= w.end);
      setCurrentWordIndex(idx);
    },
    [],
  );

  return {
    play,
    pause,
    seekTo,
    setWords,
    updateHighlight,
    currentWordIndex,
    isPlaying: status.playing,
    duration: status.duration,
    position: status.currentTime,
  };
}
