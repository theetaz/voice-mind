import { memo, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const BAR_GAP = 2;
const MIN_HEIGHT = 4;
const MAX_BARS = 40;
const INTERVAL_MS = 50; // ~20fps update rate

type Props = {
  active: boolean;
  processing: boolean;
  volume: SharedValue<number>;
  height?: number;
  barCount?: number;
  barWidth?: number;
  barColor?: string;
  barColorMuted?: string;
};

const Bar = memo(function Bar({
  index,
  heights,
  isActive,
  width,
  maxHeight,
  activeColor,
  mutedColor,
}: {
  index: number;
  heights: SharedValue<number[]>;
  isActive: SharedValue<boolean>;
  width: number;
  maxHeight: number;
  activeColor: string;
  mutedColor: string;
}) {
  const style = useAnimatedStyle(() => {
    const h = heights.value[index] ?? MIN_HEIGHT;
    return {
      width,
      height: h,
      borderRadius: width / 2,
      backgroundColor: isActive.value ? activeColor : mutedColor,
      transform: [{ translateY: (maxHeight - h) / 2 }],
    };
  });
  return <Animated.View style={style} />;
});

export const LiveWaveform = memo(function LiveWaveform({
  active,
  processing,
  volume,
  height = 80,
  barCount = MAX_BARS,
  barWidth = 3,
  barColor = '#818CF8',
  barColorMuted = '#334155',
}: Props) {
  const count = Math.min(barCount, MAX_BARS);
  const barHeights = useSharedValue<number[]>(new Array(count).fill(MIN_HEIGHT));
  const isActive = useSharedValue(false);
  const historyRef = useRef(new Array(count).fill(0));
  const indices = useRef(Array.from({ length: count }, (_, i) => i)).current;

  useEffect(() => {
    if (!active && !processing) {
      barHeights.value = new Array(count).fill(MIN_HEIGHT);
      isActive.value = false;
      historyRef.current = new Array(count).fill(0);
      return;
    }

    const half = Math.floor(count / 2);

    const id = setInterval(() => {
      const newHeights = new Array(count);

      if (active) {
        const hist = historyRef.current;
        if (!hist || hist.length === 0) return;
        hist.push(volume.value);
        if (hist.length > count) hist.shift();

        for (let i = 0; i < count; i++) {
          const distFromCenter = Math.abs(i - half) / half;
          const histIdx = Math.floor(distFromCenter * (hist.length - 1));
          const sample = hist[hist.length - 1 - histIdx] ?? 0;
          newHeights[i] = MIN_HEIGHT + sample * (height - MIN_HEIGHT);
        }
        isActive.value = true;
      } else {
        // processing mode — gentle sine wave
        const t = Date.now() / 1000;
        for (let i = 0; i < count; i++) {
          const norm = (i - half) / half;
          const cw = 1 - Math.abs(norm) * 0.4;
          const wave =
            Math.sin(t * 1.5 + norm * 3) * 0.25 +
            Math.sin(t * 0.8 - norm * 2) * 0.2 +
            Math.cos(t * 2 + norm) * 0.15;
          const v = Math.max(0.05, Math.min(1, (0.2 + wave) * cw));
          newHeights[i] = MIN_HEIGHT + v * (height - MIN_HEIGHT);
        }
        isActive.value = true;
      }

      barHeights.value = newHeights;
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, processing, count, height, volume, barHeights, isActive]);

  const totalWidth = count * barWidth + (count - 1) * BAR_GAP;

  return (
    <View
      style={{
        height,
        width: totalWidth,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: BAR_GAP,
      }}
    >
      {indices.map((i) => (
        <Bar
          key={i}
          index={i}
          heights={barHeights}
          isActive={isActive}
          width={barWidth}
          maxHeight={height}
          activeColor={barColor}
          mutedColor={barColorMuted}
        />
      ))}
    </View>
  );
});
