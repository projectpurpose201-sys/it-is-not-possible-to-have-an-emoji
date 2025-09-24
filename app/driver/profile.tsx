import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../contexts/AuthContext';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: signOut, style: 'destructive' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title="< Back"
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.content}>
        <Card style={styles.profileCard}>
          <Ionicons name="person-circle-outline" size={80} color={theme.colors.primary} style={styles.avatar} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Button
          title="Earnings"
          onPress={() => router.push('/driver/earnings')}
          variant="outline"
          style={styles.menuButton}
        />
        
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="secondary"
          style={styles.logoutButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.heading2,
    color: theme.colors.text,
    textAlign: 'center',
    flex: 1,
    marginRight: 60,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    marginBottom: theme.spacing.md,
  },
  name: {
    ...theme.typography.heading2,
    color: theme.colors.text,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  menuButton: {
    marginBottom: theme.spacing.md,
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: theme.colors.error,
  },
});
