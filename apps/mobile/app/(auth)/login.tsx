import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/lib/theme-context';

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-foreground mb-2">VoiceMind</Text>
        <Text className="text-base text-muted-foreground mb-10">AI-powered voice memos</Text>

        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-base text-foreground mb-3"
          placeholder="Email"
          placeholderTextColor={colors.mutedForeground}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-base text-foreground mb-6"
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          className="bg-primary rounded-xl py-4 items-center mb-4"
          onPress={handleLogin}
          disabled={loading}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {loading ? 'Signing in...' : 'Sign In'}
          </Text>
        </Pressable>

        <Pressable
          className="bg-card border border-border rounded-xl py-4 items-center mb-8"
          onPress={handleGoogleLogin}
        >
          <Text className="text-foreground font-semibold text-base">Continue with Google</Text>
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable className="items-center">
            <Text className="text-muted-foreground text-sm">
              Don't have an account?{' '}
              <Text className="text-primary font-semibold">Sign Up</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
