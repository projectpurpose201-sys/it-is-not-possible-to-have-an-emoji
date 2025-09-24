import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function RoleSelectionScreen() {
  const router = useRouter();

  const handleRoleSelect = (role: 'passenger' | 'driver') => {
    router.push({
      pathname: '/auth/sign-up',
      params: { role },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Your Role</Text>
            <Text style={styles.subtitle}>
              How would you like to use Vaniyambadi Ride?
            </Text>
          </View>

          <View style={styles.cardContainer}>
            <Card style={styles.roleCard}>
              <View style={styles.cardContent}>
                <Ionicons
                  name="person"
                  size={48}
                  color={theme.colors.primary}
                  style={styles.icon}
                />
                <Text style={styles.cardTitle}>Passenger</Text>
                <Text style={styles.cardDescription}>
                  Book rides and travel around Vaniyambadi with ease
                </Text>
                <Button
                  title="Continue as Passenger"
                  onPress={() => handleRoleSelect('passenger')}
                  variant="primary"
                  style={styles.roleButton}
                />
              </View>
            </Card>

            <Card style={styles.roleCard}>
              <View style={styles.cardContent}>
                <Ionicons
                  name="car"
                  size={48}
                  color={theme.colors.secondary}
                  style={styles.icon}
                />
                <Text style={styles.cardTitle}>Driver</Text>
                <Text style={styles.cardDescription}>
                  Earn money by providing rides to passengers
                </Text>
                <Button
                  title="Continue as Driver"
                  onPress={() => handleRoleSelect('driver')}
                  variant="secondary"
                  style={styles.roleButton}
                />
              </View>
            </Card>
          </View>

          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.backButton}
            textStyle={styles.backText}
          />
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'space-between',
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
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  cardContainer: {
    gap: theme.spacing.lg,
  },
  roleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  cardContent: {
    alignItems: 'center',
  },
  icon: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.heading3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cardDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  roleButton: {
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingBottom: theme.spacing.xl,
  },
  backText: {
    color: '#fff',
  },
});
