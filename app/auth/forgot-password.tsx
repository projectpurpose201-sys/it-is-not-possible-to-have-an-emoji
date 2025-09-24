import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    try {
      const { error } = await resetPassword(email);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Reset Link Sent',
        'Please check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    if (error) setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Text>
            </View>

            <Card style={styles.formCard}>
              <Input
                label="Email Address"
                value={email}
                onChangeText={updateEmail}
                error={error}
                leftIcon="mail"
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Button
                title="Send Reset Link"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.resetButton}
              />

              <Button
                title="Back to Sign In"
                onPress={() => router.back()}
                variant="ghost"
                style={styles.backToSignInButton}
              />
            </Card>

            <Button
              title="← Back"
              onPress={() => router.back()}
              variant="ghost"
              style={styles.backButton}
              textStyle={styles.backText}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl * 2,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading1,
    color: '#fff',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: theme.spacing.lg,
  },
  resetButton: {
    marginTop: theme.spacing.md,
  },
  backToSignInButton: {
    marginTop: theme.spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
  },
});
