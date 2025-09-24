import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Invoice } from '../../types';
import { format } from 'date-fns';

export default function EarningsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('driver_id', user.id)
          .order('created_at', { ascending: false });

        if (invoiceError) throw invoiceError;
        setInvoices(invoiceData as Invoice[]);

        const { data: earningsData, error: earningsError } = await supabase
          .rpc('get_total_earnings', { driver_uuid: user.id });
        
        if (earningsError) throw earningsError;
        setTotalEarnings(earningsData);

      } catch (error) {
        console.error('Error fetching earnings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const renderItem = ({ item }: { item: Invoice }) => (
    <Card style={styles.invoiceCard}>
      <View style={styles.invoiceHeader}>
        <Text style={styles.invoiceDate}>
          {format(new Date(item.date_from), 'MMM dd')} - {format(new Date(item.date_to), 'MMM dd, yyyy')}
        </Text>
        <Text style={styles.invoiceTotal}>₹{item.total_earnings}</Text>
      </View>
      <Text style={styles.commission}>Commission: ₹{item.commission}</Text>
      <Text style={[styles.status, { color: item.status === 'paid' ? theme.colors.success : theme.colors.warning }]}>
        Status: {item.status}
      </Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button
          title="< Back"
          onPress={() => router.back()}
          variant="ghost"
        />
        <Text style={styles.title}>Earnings</Text>
      </View>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Lifetime Earnings</Text>
        <Text style={styles.summaryValue}>₹{totalEarnings.toFixed(2)}</Text>
      </Card>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }}/>
      ) : invoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No invoices yet.</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.listHeader}>Invoice History</Text>}
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
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  summaryLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.heading1,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
  },
  listHeader: {
    ...theme.typography.heading3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  invoiceCard: {
    marginBottom: theme.spacing.md,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceDate: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  invoiceTotal: {
    ...theme.typography.heading3,
    color: theme.colors.primary,
  },
  commission: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  status: {
    ...theme.typography.bodySmall,
    fontWeight: 'bold',
    marginTop: theme.spacing.sm,
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
