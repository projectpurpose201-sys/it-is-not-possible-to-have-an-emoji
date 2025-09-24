import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Ride } from '../../types';
import { format } from 'date-fns';

export default function RideHistoryScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('rides')
          .select('*')
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRides(data as Ride[]);
      } catch (error) {
        console.error('Error fetching ride history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [user]);

  const renderItem = ({ item }: { item: Ride }) => (
    <Card style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <Text style={styles.rideDate}>
          {format(new Date(item.created_at), 'MMM dd, yyyy - p')}
        </Text>
        <Text style={styles.rideFare}>₹{item.fare_final || item.fare_estimate}</Text>
      </View>
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>From:</Text>
        <Text style={styles.addressText}>{item.pickup_address}</Text>
      </View>
      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>To:</Text>
        <Text style={styles.addressText}>{item.drop_address}</Text>
      </View>
      <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
        Status: {item.status}
      </Text>
    </Card>
  );

  const getStatusColor = (status: Ride['status']) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
      default: return theme.colors.warning;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title="< Back"
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text style={styles.title}>Ride History</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }}/>
      ) : rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No rides yet.</Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
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
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.heading2,
    color: theme.colors.text,
    textAlign: 'center',
    flex: 1,
    marginRight: 60,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
  },
  rideCard: {
    marginBottom: theme.spacing.md,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  rideDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  rideFare: {
    ...theme.typography.heading3,
    color: theme.colors.primary,
  },
  addressContainer: {
    marginBottom: theme.spacing.xs,
  },
  addressLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  addressText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  status: {
    ...theme.typography.bodySmall,
    marginTop: theme.spacing.sm,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.heading3,
    color: theme.colors.textSecondary,
  },
});
