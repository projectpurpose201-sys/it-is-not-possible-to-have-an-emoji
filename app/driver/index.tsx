import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { theme } from "../../utils/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

type DriverStatus = "not_submitted" | "pending_verification" | "approved" | "rejected";

export default function DriverMainScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [driverStatus, setDriverStatus] = useState<DriverStatus>("not_submitted");
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalRides, setTotalRides] = useState(0);

  // form states
  const [aadhaar, setAadhaar] = useState("");
  const [license, setLicense] = useState("");
  const [autoNumber, setAutoNumber] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    checkDriverStatus();
    getCurrentLocation();
    fetchDashboardData();

    const subscription = supabase
      .channel("ride-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides", filter: "status=eq.pending" },
        handleNewRideRequest
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const checkDriverStatus = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("driver_docs")
        .select("status")
        .eq("driver_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking driver status:", error);
        return;
      }

      setDriverStatus(data?.status || "not_submitted");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: todayRides, error } = await supabase
        .from("rides")
        .select("fare_final")
        .eq("driver_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);

      if (error) throw error;

      const earnings = todayRides?.reduce((sum, ride) => sum + (ride.fare_final || 0), 0) || 0;
      setTodayEarnings(earnings);
      setTotalRides(todayRides?.length || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleNewRideRequest = async (payload: any) => {
    if (!user?.id || !isOnline || !currentLocation) return;

    const ride = payload.new;

    const distance = calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      ride.pickup_lat,
      ride.pickup_lng
    );

    if (distance <= 3) {
      setRideRequests((prev) => [...prev, ride]);
      Alert.alert(
        "New Ride Request",
        `Pickup: ${ride.pickup_address}\nDrop: ${ride.drop_address}\nFare: ₹${ride.fare_estimate}`,
        [
          { text: "Reject", style: "cancel" },
          { text: "Accept", onPress: () => acceptRide(ride.id) },
        ]
      );
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const acceptRide = async (rideId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("rides")
        .update({ driver_id: user.id, status: "accepted" })
        .eq("id", rideId);

      if (error) throw error;

      setRideRequests((prev) => prev.filter((r) => r.id !== rideId));
      router.push({ pathname: "/driver/active-ride", params: { rideId } });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user?.id) return;

    if (driverStatus !== "approved") {
      Alert.alert("Not Approved", "Your documents are still pending verification.");
      return;
    }

    if (!currentLocation) {
      Alert.alert("Location Required", "Please enable location services.");
      return;
    }

    setLoading(true);
    try {
      const newStatus = !isOnline;

      if (newStatus) {
        const { error } = await supabase.from("driver_locations").upsert({
          driver_id: user.id,
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
          status: "online",
          last_updated: new Date().toISOString(),
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("driver_locations")
          .update({ status: "offline" })
          .eq("driver_id", user.id);

        if (error) throw error;
      }

      setIsOnline(newStatus);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: signOut, style: "destructive" },
    ]);
  };

  const submitDocuments = async () => {
    if (!user?.id) return;

    if (!aadhaar || !license || !autoNumber) {
      Alert.alert("Missing Info", "Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase.from("driver_docs").upsert({
        driver_id: user.id,
        aadhaar_number: aadhaar,
        license_number: license,
        auto_number: autoNumber,
        status: "pending_verification",
      });

      if (error) throw error;

      setDriverStatus("pending_verification");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {user?.name}!</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Case 1: Not submitted yet */}
        {driverStatus === "not_submitted" && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Complete your account to start earning</Text>

            <TextInput
              style={styles.input}
              placeholder="Aadhaar Number"
              value={aadhaar}
              onChangeText={setAadhaar}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="License Number"
              value={license}
              onChangeText={setLicense}
            />
            <TextInput
              style={styles.input}
              placeholder="Auto Number"
              value={autoNumber}
              onChangeText={setAutoNumber}
            />

            <Button title="Submit for Verification" onPress={submitDocuments} />
          </Card>
        )}

        {/* Case 2: Pending verification */}
        {driverStatus === "pending_verification" && (
          <Card style={styles.warningCard}>
            <Ionicons name="time-outline" size={32} color={theme.colors.warning} />
            <Text style={styles.warningTitle}>Verification Pending</Text>
            <Text style={styles.warningText}>
              Your documents are being reviewed. You'll be notified once approved.
            </Text>
          </Card>
        )}

        {/* Case 3: Rejected */}
        {driverStatus === "rejected" && (
          <Card style={styles.warningCard}>
            <Ionicons name="close-circle-outline" size={32} color={theme.colors.error} />
            <Text style={styles.warningTitle}>Verification Rejected</Text>
            <Text style={styles.warningText}>Please re-submit your details.</Text>
            <Button title="Retry" onPress={() => setDriverStatus("not_submitted")} />
          </Card>
        )}

        {/* Case 4: Approved */}
        {driverStatus === "approved" && (
          <>
            <Card style={styles.onlineCard}>
              <View style={styles.onlineHeader}>
                <Text style={styles.onlineTitle}>Driver Status</Text>
                <Switch
                  value={isOnline}
                  onValueChange={toggleOnlineStatus}
                  disabled={loading}
                  trackColor={{ false: theme.colors.border, true: theme.colors.success }}
                  thumbColor={isOnline ? "#fff" : "#f4f3f4"}
                />
              </View>
              <Text style={styles.onlineStatus}>
                {isOnline ? "🟢 Online - Ready for rides" : "🔴 Offline"}
              </Text>
            </Card>

            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>₹{todayEarnings}</Text>
                <Text style={styles.statLabel}>Today's Earnings</Text>
              </Card>

              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{totalRides}</Text>
                <Text style={styles.statLabel}>Rides Completed</Text>
              </Card>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/driver/earnings")}
              >
                <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.actionText}>Earnings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/driver/profile")}
              >
                <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.actionText}>Profile</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerLeft: { flex: 1 },
  greeting: { ...theme.typography.heading2, color: theme.colors.text },
  logoutButton: { padding: theme.spacing.sm },
  content: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  formCard: { padding: theme.spacing.lg },
  formTitle: { ...theme.typography.heading3, marginBottom: theme.spacing.md },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: "#fff",
  },
  warningCard: { alignItems: "center", padding: theme.spacing.lg, marginBottom: theme.spacing.lg },
  warningTitle: { ...theme.typography.heading3, marginVertical: theme.spacing.sm },
  warningText: { ...theme.typography.bodySmall, textAlign: "center" },
  onlineCard: { marginBottom: theme.spacing.lg, padding: theme.spacing.lg },
  onlineHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.sm },
  onlineTitle: { ...theme.typography.heading3 },
  onlineStatus: { ...theme.typography.bodySmall },
  statsContainer: { flexDirection: "row", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  statCard: { flex: 1, alignItems: "center", padding: theme.spacing.lg },
  statValue: { ...theme.typography.heading2, color: theme.colors.primary, fontWeight: "700" },
  statLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  quickActions: { flexDirection: "row", gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    ...theme.shadows.sm,
  },
  actionText: { ...theme.typography.bodySmall, marginTop: theme.spacing.sm },
});
