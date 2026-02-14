import { registerGlobals } from '@livekit/react-native';

registerGlobals();

export const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL!;
