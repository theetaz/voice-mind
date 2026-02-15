import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/lib/theme-context';

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background"
      >
        <View className="flex-1 justify-center px-8">
          <View className="items-center mb-6">
            <Image
              source={require('@/assets/main-logo.png')}
              style={{ width: 80, height: 80 }}
              contentFit="contain"
            />
          </View>
          <Text className="text-4xl font-bold text-foreground mb-2 text-center">VoiceMind</Text>
          <Text className="text-base text-muted-foreground mb-10 text-center">
            AI-powered voice memos
          </Text>

          <TextInput
            className="bg-card border border-border rounded-xl px-4 py-3.5 text-base text-foreground mb-3"
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View className="relative mb-6">
            <TextInput
              className="bg-card border border-border rounded-xl px-4 py-3.5 pr-12 text-base text-foreground"
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable
              onPress={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-0 bottom-0 justify-center"
              style={{ minWidth: 44, minHeight: 44 }}
              hitSlop={8}
              accessible
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Image
                source={`sf:${showPassword ? 'eye.slash' : 'eye'}`}
                style={{ width: 20, height: 20 }}
                tintColor={colors.mutedForeground}
              />
            </Pressable>
          </View>

          <Pressable
            className="bg-primary rounded-xl py-4 items-center mb-4"
            onPress={handleLogin}
            disabled={loading}
            style={{ minHeight: 44 }}
          >
            <Text className="text-primary-foreground font-semibold text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable
            className="bg-card border border-border rounded-xl py-4 flex-row items-center justify-center gap-3 mb-8"
            onPress={handleGoogleLogin}
            style={{ minHeight: 44 }}
          >
            <Image
              source={{ uri: 'https://www.google.com/favicon.ico' }}
              style={{ width: 20, height: 20 }}
              contentFit="contain"
            />
            <Text className="text-foreground font-semibold text-base">Continue with Google</Text>
          </Pressable>

          <Link href="/(auth)/register" asChild>
            <Pressable className="items-center" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text className="text-muted-foreground text-sm">
                Don't have an account?{' '}
                <Text className="text-primary font-semibold">Sign Up</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
