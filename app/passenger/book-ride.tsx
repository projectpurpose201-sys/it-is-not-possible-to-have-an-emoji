import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function BookRideScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pickup, drop, fare } = useLocalSearchParams<{
    pickup: string;
    drop: string;
    fare: string;
  }>();

  const [bookingType, setBookingType] = useState<'now' | 'prebook'>('now');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchingDrivers, setSearchingDrivers] = useState(false);

  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  ];

  const handleBookNow = async () => {
    setLoading(true);
    setSearchingDrivers(true);

    try {
      // Create ride request
      const { data: ride, error } = await supabase
        .from('rides')
        .insert({
          passenger_id: user?.id,
          pickup_lat: 12.6820, // Mock coordinates for Vaniyambadi
          pickup_lng: 78.6201,
          pickup_address: pickup,
          drop_lat: 12.6850,
          drop_lng: 78.6180,
          drop_address: drop,
          fare_estimate: parseInt(fare || '0'),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Find nearest drivers
      const { data: drivers, error: driversError } = await supabase
        .rpc('find_nearest_drivers', {
          pickup_lat: 12.6820,
          pickup_lng: 78.6201,
        });

      if (driversError) throw driversError;

      if (drivers && drivers.length > 0) {
        // Navigate to ride tracking
        router.push({
          pathname: '/passenger/ride-tracking',
          params: { rideId: ride.id },
        });
      } else {
        // No drivers available
        await supabase
          .from('rides')
          .update({ status: 'cancelled', cancellation_reason: 'No drivers available' })
          .eq('id', ride.id);

        Alert.alert(
          'No Drivers Available',
          'Sorry, no drivers are available in your area right now. Please try again later.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setSearchingDrivers(false);
    }
  };

  const handlePrebook = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Missing Information', 'Please select date and time for prebooking');
      return;
    }

    const prebookDateTime = `${selectedDate}T${selectedTime}:00`;
    
    setLoading(true);
    try {
      // Create prebook ride request
      const { data: ride, error } = await supabase
        .from('rides')
        .insert({
          passenger_id: user?.id,
          pickup_lat: 12.6820,
          pickup_lng: 78.6201,
          pickup_address: pickup,
          drop_lat: 12.6850,
          drop_lng: 78.6180,
          drop_address: drop,
          fare_estimate: parseInt(fare || '0'),
          status: 'pending',
          prebook: true,
          prebook_datetime: prebookDateTime,
          prebook_payment_pending: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Open UPI payment deep link
      const upiLink = `upi://pay?pa=vaniyambadi.ride@paytm&pn=Vaniyambadi Ride&am=10&cu=INR&tn=Prebook Payment - ${ride.id}`;
      
      Alert.alert(
        'Payment Required',
        'Please pay ₹10 booking fee to confirm your ride',
        [
          { 
            text: 'Pay Now', 
            onPress: () => {
              // In a real app, you would open the UPI link
              Alert.alert('Payment', 'Please complete payment in your UPI app');
              router.push({
                pathname: '/passenger/ride-tracking',
                params: { rideId: ride.id },
              });
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7); // Allow booking up to 7 days ahead
    return maxDate.toISOString().split('T')[0];
  };

  if (searchingDrivers) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.searchingContainer}>
          <Ionicons name="car" size={64} color={theme.colors.primary} />
          <Text style={styles.searchingTitle}>Finding nearby drivers...</Text>
          <Text style={styles.searchingText}>
            We're looking for the best driver for your ride
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={() => router.back()}
            variant="ghost"
            style={styles.backButton}
          />
          <Text style={styles.title}>Book Your Ride</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.tripCard}>
            <View style={styles.tripInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color={theme.colors.success} />
                <Text style={styles.locationText}>{pickup}</Text>
              </View>
              <View style={styles.dividerLine} />
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={20} color={theme.colors.error} />
                <Text style={styles.locationText}>{drop}</Text>
              </View>
            </View>
            
            <View style={styles.fareContainer}>
              <Text style={styles.fareLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>₹{fare}</Text>
            </View>
          </Card>

          <Card style={styles.bookingTypeCard}>
            <Text style={styles.cardTitle}>When do you want to travel?</Text>
            
            <View style={styles.typeButtons}>
              <Button
                title="Book Now"
                onPress={() => setBookingType('now')}
                variant={bookingType === 'now' ? 'primary' : 'outline'}
                style={styles.typeButton}
              />
              <Button
                title="Pre-book"
                onPress={() => setBookingType('prebook')}
                variant={bookingType === 'prebook' ? 'primary' : 'outline'}
                style={styles.typeButton}
              />
            </View>

            {bookingType === 'prebook' && (
              <View style={styles.prebookContainer}>
                <Text style={styles.prebookTitle}>Select Date & Time</Text>
                <Text style={styles.prebookFee}>Booking fee: ₹10</Text>
                
                <Calendar
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  markedDates={{
                    [selectedDate]: { selected: true, selectedColor: theme.colors.primary }
                  }}
                  minDate={getTomorrowDate()}
                  maxDate={getMaxDate()}
                  theme={{
                    arrowColor: theme.colors.primary,
                    todayTextColor: theme.colors.primary,
                    selectedDayBackgroundColor: theme.colors.primary,
                  }}
                />

                <Text style={styles.timeLabel}>Select Time</Text>
                <View style={styles.timeSlots}>
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      title={time}
                      onPress={() => setSelectedTime(time)}
                      variant={selectedTime === time ? 'primary' : 'outline'}
                      size="sm"
                      style={styles.timeSlot}
                    />
                  ))}
                </View>
              </View>
            )}
          </Card>

          <Button
            title={bookingType === 'now' ? 'Book Ride Now' : 'Pre-book Ride'}
            onPress={bookingType === 'now' ? handleBookNow : handlePrebook}
            loading={loading}
            style={styles.bookButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.heading2,
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  tripCard: {
    marginBottom: theme.spacing.lg,
  },
  tripInfo: {
    marginBottom: theme.spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  locationText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  dividerLine: {
    height: 20,
    width: 2,
    backgroundColor: theme.colors.border,
    marginLeft: 10,
  },
  fareContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  fareLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  fareAmount: {
    ...theme.typography.heading2,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  bookingTypeCard: {
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    ...theme.typography.heading3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  typeButton: {
    flex: 1,
  },
  prebookContainer: {
    marginTop: theme.spacing.lg,
  },
  prebookTitle: {
    ...theme.typography.heading3,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  prebookFee: {
    ...theme.typography.bodySmall,
    color: theme.colors.warning,
    marginBottom: theme.spacing.lg,
  },
  timeLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  timeSlot: {
    minWidth: 70,
  },
  bookButton: {
    backgroundColor: theme.colors.primary,
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  searchingTitle: {
    ...theme.typography.heading2,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  searchingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
