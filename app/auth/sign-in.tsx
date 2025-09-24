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

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await signIn(formData.email, formData.password);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Navigation will be handled by the useAuth hook in index.tsx
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to your account
              </Text>
            </View>

            <Card style={styles.formCard}>
              <Input
                label="Email Address"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                error={errors.email}
                leftIcon="mail"
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                error={errors.password}
                leftIcon="lock-closed"
                placeholder="Enter your password"
                secureTextEntry
              />

              <Button
                title="Sign In"
                onPress={handleSignIn}
                loading={loading}
                style={styles.signInButton}
              />

              <Button
                title="Forgot Password?"
                onPress={() => router.push('/auth/forgot-password')}
                variant="ghost"
                style={styles.forgotButton}
              />

              <View style={styles.divider}>
                <Text style={styles.dividerText}>Don't have an account?</Text>
              </View>

              <Button
                title="Create Account"
                onPress={() => router.push('/auth/role-selection')}
                variant="outline"
                style={styles.createButton}
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
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: theme.spacing.lg,
  },
  signInButton: {
    marginTop: theme.spacing.md,
  },
  forgotButton: {
    marginTop: theme.spacing.sm,
  },
  divider: {
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  createButton: {
    borderColor: theme.colors.primary,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
  },
});
