// DriverMainScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  ScrollView,
  BackHandler,
  Animated,
  Dimensions,
  Platform,
  FlatList,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { supabase } from "../../lib/supabase"; // <-- adjust path if your project differs
import { useAuth } from "../../hooks/useAuth"; // <-- adjust if you use useSession
import { theme } from "../../utils/theme";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { StatusBar as RNStatusBar } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import RideRequests from "../driver/riderequest";

const SCREEN_WIDTH = Dimensions.get("window").width;

type DriverStatus = "not_submitted" | "pending_verification" | "approved" | "rejected";

export default function DriverMainScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [incomingRides, setIncomingRides] = useState<any[]>([]);


  // Drawer animation
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.75)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Driver state
  const [driverStatus, setDriverStatus] = useState<DriverStatus>("not_submitted");
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalRides, setTotalRides] = useState(0);

  // Form
  const [aadhaar, setAadhaar] = useState("");
  const [license, setLicense] = useState("");
  const [autoNumber, setAutoNumber] = useState("");
const [modalVisible, setModalVisible] = useState(false);
useEffect(() => {
  if (!user?.id) return;

  // initial driver setup
  checkDriverStatus();
  getCurrentLocation();
  fetchDashboardData();

  // 1) Fetch pending rides when driver becomes online
  const fetchPendingRides = async () => {
    if (!isOnline) {
      setIncomingRides([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (!error && data) {
        setIncomingRides(data || []);
      }
    } catch (e) {
      console.error("fetchPendingRides exception:", e);
    }
  };

  fetchPendingRides();

  // --- handlers for realtime events ---
  const handleInsert = (payload: any) => {
    const ride = payload.new;
    if (!ride || ride.status !== "pending") return;
    if (!isOnline || driverStatus !== "approved") return;

    setIncomingRides((prev) => {
      if (prev.find((r) => r.id === ride.id)) return prev; // avoid duplicates
      return [...prev, ride];
    });
  };

  const handleUpdate = (payload: any) => {
    const ride = payload.new;
    if (!ride) return;

    if (ride.status === "pending") {
      if (!isOnline || driverStatus !== "approved") return;
      setIncomingRides((prev) => {
        const exists = prev.find((r) => r.id === ride.id);
        if (exists) {
          return prev.map((r) => (r.id === ride.id ? ride : r)); // update entry
        }
        return [...prev, ride];
      });
      return;
    }

    // ride status changed (accepted / cancelled / etc) → remove it
    setIncomingRides((prev) => prev.filter((r) => r.id !== ride.id));
  };

  const handleDelete = (payload: any) => {
    const ride = payload.old;
    if (!ride) return;
    setIncomingRides((prev) => prev.filter((r) => r.id !== ride.id));
  };

  // 2) Subscribe to INSERT / UPDATE / DELETE on rides table
  const rideChannel = supabase
    .channel("rides-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "rides" },
      handleInsert
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rides" },
      handleUpdate
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "rides" },
      handleDelete
    )
    .subscribe();

  // 3) Driver docs subscription
  const docsChannel = supabase
    .channel("driver-docs-status")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "driver_docs" },
      (payload: any) => {
        if (payload.new?.driver_id === user.id) {
          setDriverStatus(payload.new.status);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(rideChannel);
    supabase.removeChannel(docsChannel);
  };
}, [user?.id, isOnline, driverStatus]);





  // Back handler (drawer + logout)
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (drawerOpen) {
          toggleDrawer();
          return true;
        }
        Alert.alert("Logout", "Do you want to logout?", [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", onPress: () => signOut() },
        ]);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [drawerOpen, signOut])
  );

  // -------------------------
  // UI helpers
  // -------------------------
  const toggleDrawer = () => {
    if (!drawerOpen) {
      Animated.timing(drawerAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(drawerAnim, { toValue: -SCREEN_WIDTH * 0.75, duration: 300, useNativeDriver: true }).start();
    }
    setDrawerOpen(!drawerOpen);
  };

  // -------------------------
  // Driver functions
  // -------------------------
  const checkDriverStatus = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from("driver_docs").select("status").eq("driver_id", user.id).single();
      if (error && (error as any).code !== "PGRST116") console.error(error);
      setDriverStatus((data as any)?.status || "not_submitted");
      console.log("Driver status:", (data as any)?.status);
    } catch (e) {
      console.error("checkDriverStatus error", e);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc);
      console.log("Current location:", loc?.coords);
    } catch (e) {
      console.error("getCurrentLocation error", e);
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
      const earnings = (todayRides as any[])?.reduce((s, r) => s + (r.fare_final || 0), 0) || 0;
      setTodayEarnings(earnings);
      setTotalRides((todayRides as any[])?.length || 0);
      console.log("Dashboard:", { earnings, total: (todayRides as any[])?.length });
    } catch (e) {
      console.error("fetchDashboardData error", e);
    }
  };

const handleNewRideRequest = (payload: any) => {
  const ride = payload.new;

  if (!user?.id || !isOnline || driverStatus !== "approved" || ride.status !== "pending") {
    return;
  }

  setIncomingRides((prev) => {
    // avoid duplicate ride IDs
    if (prev.find((r) => r.id === ride.id)) return prev;
    return [...prev, ride];
  });
};






const acceptRide = async (rideId: string) => {
  if (!user?.id) return;
  try {
    // Only accept if ride is still pending — DB will ensure first-wins
    const { data, error } = await supabase
      .from("rides")
      .update({ driver_id: user.id, status: "accepted" })
      .eq("id", rideId)
      .eq("status", "pending")
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      // no row returned => another driver already took it or status changed
      Alert.alert("Too Late", "This ride was already accepted by another driver.");
      setIncomingRides((prev) => prev.filter((r) => r.id !== rideId));
      return;
    }

    // success
    setIncomingRides((prev) => prev.filter((r) => r.id !== rideId));
    router.push({
  pathname: "/driver/ride/[rideId]",
  params: { rideId },
});

  } catch (e: any) {
    console.error("acceptRide error:", e);
    Alert.alert("Error", e.message || String(e));
  }
};



const rejectRide = (rideId: string) => {
  setIncomingRides((prev) => prev.filter((r) => r.id !== rideId));
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
        },
        { onConflict: "driver_id" } 
      );
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("driver_locations")
          .update({ status: "offline", last_updated: new Date().toISOString() })
          .eq("driver_id", user.id);
        if (error) throw error;
      }
      setIsOnline(newStatus);
    } catch (e: any) {
      Alert.alert("Error", e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: () => signOut(), style: "destructive" },
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
    } catch (e: any) {
      Alert.alert("Error", e.message || String(e));
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>  Hello, {user?.name}</Text>
        
      </View>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <Ionicons name="person-circle-outline" size={60} color="#ccc" />
          <Text style={styles.drawerName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.drawerItem} onPress={() => router.push("/driver/profile")}>
          <Text>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem} onPress={handleLogout}>
          <Text>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem}>
          <Text>Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem}>
          <Text>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerItem}>
          <Text>About</Text>
        </TouchableOpacity>
      </Animated.View>

      {drawerOpen && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={toggleDrawer} />}

      {/* Content */}
      <FlatList
  data={[]} // no rows, only header
  renderItem={null}
  ListHeaderComponent={
    <>
      {driverStatus === "not_submitted" && (
        <Card style={styles.card}>
          <Text style={styles.title}>Complete your account to start earning</Text>
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

      {driverStatus === "pending_verification" && (
        <Card style={styles.card}>
          <Ionicons name="time-outline" size={32} color={theme.colors.warning} />
          <Text style={styles.title}>Verification Pending</Text>
          <Text>Your documents are being reviewed.</Text>
        </Card>
      )}

      {driverStatus === "rejected" && (
        <Card style={styles.card}>
          <Ionicons name="close-circle-outline" size={32} color={theme.colors.error} />
          <Text style={styles.title}>Verification Rejected</Text>
          <Button title="Retry" onPress={() => setDriverStatus("not_submitted")} />
        </Card>
      )}

      {driverStatus === "approved" && (
        <>
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.title}>Driver Status</Text>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                disabled={loading}
              />
            </View>
            <Text>
              {isOnline ? "🟢 Online - Ready for rides" : "🔴 Offline"}
            </Text>
          </Card>

        

          {isOnline && (
  <View style={{ padding: 16 }}>
  <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
    Pending Rides
  </Text>

  <View style={{ maxHeight: 320 }}> 
    <ScrollView
      style={{ flexGrow: 0 }}
      showsVerticalScrollIndicator={false}
    >
      {incomingRides.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            borderRadius: 12,
            backgroundColor: "#f9f9f9",
          }}
        >
          <Ionicons name="car-outline" size={40} color="gray" />
          <Text style={{ marginTop: 10, fontSize: 16, color: "gray" }}>
            No pending rides right now
          </Text>
          <Text style={{ fontSize: 14, color: "gray" }}>
            Stay online to get new requests 🚖
          </Text>
        </View>
      ) : (
        incomingRides.map((item, index) => (
          <View key={item.id} style={{ marginBottom: 12 }}>
            <RideRequests
              rides={[item]}
              onAccept={acceptRide}
              onReject={rejectRide}
            />
          </View>
        ))
      )}
    </ScrollView>
  </View>
</View>

)}
<View style={styles.row}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>₹{todayEarnings}</Text>
              <Text>Today's Earnings</Text>
            </Card>

            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{totalRides}</Text>
              <Text>Rides Completed</Text>
            </Card>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/driver/earnings")}
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.actionText}>Earnings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push("/driver/profile")}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </>
  }
/>


      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/driver")}>
          <Ionicons name="home-outline" size={24} />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/driver/earnings")}>
          <Ionicons name="car-outline" size={24} />
          <Text>Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/driver/wallet")}>
          <Ionicons name="wallet-outline" size={24} />
          <Text>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => router.push("/driver/profile")}>
          <Ionicons name="person-outline" size={24} />
          <Text>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === "android" ? (RNStatusBar.currentHeight ?? 0) + 8 : 16,
    paddingBottom: theme.spacing.sm,
    backgroundColor: "white",
    elevation: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.primary },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: "white",
    elevation: 12,
    padding: theme.spacing.md,
    zIndex: 20,
    
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: SCREEN_WIDTH * 0.75,
    width: SCREEN_WIDTH * 0.25,
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.2)",
    zIndex: 9,
  },
  drawerHeader: { alignItems: "center", marginBottom: 20 },
  drawerName: { fontWeight: "bold", fontSize: 16 },
  drawerItem: { paddingVertical: 12 },
  scrollContent: { padding: theme.spacing.md, paddingBottom: 80 },
  card: { marginBottom: theme.spacing.md, padding: theme.spacing.lg },
  title: { fontSize: 16, fontWeight: "600", marginBottom: theme.spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statCard: { flex: 1, alignItems: "center", margin: 4, padding: theme.spacing.lg },
  statValue: { fontSize: 18, fontWeight: "700", color: theme.colors.primary },
  quickActions: { flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: "center",
    ...theme.shadows?.sm,
    marginHorizontal: 4,
  },
  actionText: { marginTop: theme.spacing.sm },
  footer: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#ddd", backgroundColor: "white" },
  footerTab: { alignItems: "center" },
  actionBtn: {
  flex: 1,
  padding: 12,
  borderRadius: 8,
  marginHorizontal: 5,
  alignItems: "center",
},
actionBtnText: {
  color: "#fff",
  fontWeight: "600",
},
pendingContainer: {
  borderWidth: 1,
  borderColor: "#ddd",
  borderRadius: 12,
  padding: 16,
  backgroundColor: "#fff",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2, // Android shadow
  marginHorizontal: 16,
  marginBottom: 16,
},
pendingTitle: {
  fontSize: 18,
  fontWeight: "bold",
  marginBottom: 8,
  color: "#333",
},
emptyRides: {
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  borderRadius: 12,
  backgroundColor: "#f9f9f9",
},
emptyText: {
  marginTop: 10,
  fontSize: 16,
  color: "gray",
},
emptySubText: {
  fontSize: 14,
  color: "gray",
},

});
