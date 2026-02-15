import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/lib/theme-context';

export default function RegisterScreen() {
  const { signUpWithEmail } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password) return;
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      Alert.alert('Success', 'Check your email for a confirmation link');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-foreground mb-2">Create Account</Text>
        <Text className="text-base text-muted-foreground mb-10">
          Start capturing your thoughts
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
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-base text-foreground mb-3"
          placeholder="Password"
          placeholderTextColor={colors.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3.5 text-base text-foreground mb-6"
          placeholder="Confirm Password"
          placeholderTextColor={colors.mutedForeground}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Pressable
          className="bg-primary rounded-xl py-4 items-center mb-8"
          onPress={handleRegister}
          disabled={loading}
        >
          <Text className="text-primary-foreground font-semibold text-base">
            {loading ? 'Creating account...' : 'Create Account'}
          </Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable className="items-center">
            <Text className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Text className="text-primary font-semibold">Sign In</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
