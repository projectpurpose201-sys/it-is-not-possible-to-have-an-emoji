import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../utils/theme';
import { Button } from '../components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'passenger') {
        router.replace('/passenger');
      } else if (user.role === 'driver') {
        router.replace('/driver');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Vaniyambadi Ride</Text>
            <Text style={styles.subtitle}>
              Your trusted ride partner in Vaniyambadi
            </Text>
          </View>

          {/* Illustration */}
          <View style={styles.illustration}>
            <Text style={styles.emoji}>🚗</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Get Started"
              onPress={() => router.push('/auth/role-selection')}
              variant="primary"
              size="lg"
              style={styles.button}
              textStyle={styles.buttonText} // make text visible
            />

            <Button
              title="Already have an account? Sign In"
              onPress={() => router.push('/auth/sign-in')}
              variant="ghost"
              style={styles.signInButton}
              textStyle={styles.signInText}
            />
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl * 2,
  },
  title: {
    ...theme.typography.heading1,
    color: '#fff',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 120,
  },
  buttonContainer: {
    width: '100%',
    paddingBottom: theme.spacing.xxl,
  },
  button: {
    backgroundColor: '#fff',
    marginBottom: theme.spacing.md,
  },
  buttonText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  signInButton: {
    backgroundColor: 'transparent',
  },
  signInText: {
    color: '#fff',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
