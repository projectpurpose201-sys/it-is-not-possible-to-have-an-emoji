import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function SignUpScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: 'passenger' | 'driver' }>();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        {
          name: formData.name,
          phone: formData.phone,
          role: role!,
        }
      );

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => {
            
                router.push('/auth/sign-in');
            },
          },
        ]
      );
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
              <Text style={styles.title}>
                Sign Up as {role === 'passenger' ? 'Passenger' : 'Driver'}
              </Text>
              <Text style={styles.subtitle}>
                Create your account to get started
              </Text>
            </View>

            <Card style={styles.formCard}>
              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={(value) => updateFormData('name', value)}
                error={errors.name}
                leftIcon="person"
                placeholder="Enter your full name"
              />

              <Input
                label="Phone Number"
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                error={errors.phone}
                leftIcon="call"
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />

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
                placeholder="Create a strong password"
                secureTextEntry
              />

              <Input
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                error={errors.confirmPassword}
                leftIcon="lock-closed"
                placeholder="Confirm your password"
                secureTextEntry
              />

              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={loading}
                style={styles.signUpButton}
              />

              <Button
                title="Already have an account? Sign In"
                onPress={() => router.push('/auth/sign-in')}
                variant="ghost"
                style={styles.signInButton}
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
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading2,
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
  signUpButton: {
    marginTop: theme.spacing.md,
  },
  signInButton: {
    marginTop: theme.spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
  },
});
