import "react-native-reanimated";
import React, { useState, useEffect, useRef } from "react";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  BackHandler,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSession } from "../../contexts/AuthContext";
import { theme } from "../../utils/theme";
import { supabase } from "../../utils/supabaseClient";
import { StatusBar as RNStatusBar } from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;

const VAN_REGION = {
  latitude: 12.6820,
  longitude: 78.6201,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function PassengerMainScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  const mapRef = useRef<MapView>(null);
  const drawerAnim = useRef(new Animated.Value(-SCREEN_WIDTH * 0.75)).current;

const [pickup, setPickup] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
const [drop, setDrop] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);

  const [mapRegion, setMapRegion] = useState<Region>(VAN_REGION);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [fare, setFare] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [adsTop, setAdsTop] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropAddress, setDropAddress] = useState<string>("");
  const LOCATIONIQ_KEY = "pk.6528e5690b2a09e0c624889317ee6965";
  // Ride booking state
const [rideId, setRideId] = useState<string | null>(null);
const [ride, setRide] = useState<any>(null);
const [countdown, setCountdown] = useState<number>(0);
const timerRef = useRef<NodeJS.Timeout | null>(null);
useEffect(() => {
  if (countdown <= 0 && rideId && ride?.status === "pending") {
    autoCancelIfNoDriver();
  }
}, [countdown, rideId, ride]);

  // --- Get current location ---
  useEffect(() => {
    getCurrentLocation();
    fetchAds();
  }, []);

  const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const address = await fetchAddress(loc.coords.latitude, loc.coords.longitude);

    setPickup({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      address,
    });

    setMapRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
};



  // --- Reverse geocode to address ---
  
const fetchAddress = async (lat: number, lon: number) => {
  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json`
    );
    const data = await res.json();
    return data.display_name || "";
  } catch (e) {
    console.error("Failed to fetch address from LocationIQ:", e);
    return "";
  }
};





  // --- Fetch route from OSRM ---
  const fetchRoute = async (dropLocation: { latitude: number; longitude: number }) => {
  if (!pickup) return;
  try {
    const url = `https://us1.locationiq.com/v1/directions/driving/${pickup.longitude},${pickup.latitude};${dropLocation.longitude},${dropLocation.latitude}?key=${LOCATIONIQ_KEY}&overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data?.routes && data.routes.length > 0) {
      const points = data.routes[0].geometry.coordinates.map((c: number[]) => ({
        latitude: c[1],
        longitude: c[0],
      }));
      setRouteCoords(points);
      const distKm = data.routes[0].distance / 1000;
      setDistance(distKm);
      setFare(Math.round(distKm * 45));
    }
  } catch (e) {
    console.error("Failed to fetch route from LocationIQ:", e);
  }
};


  // --- Fetch Ads ---
  const fetchAds = async () => {
    const { data: ads, error } = await supabase
      .from("ads")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    if (ads?.length) setAdsTop([ads[0]]);
    else setAdsTop([{ title: "Your Ad Here!" }]); // placeholder
  };

  // --- Drawer Slide ---
  const toggleDrawer = () => {
    if (!drawerOpen) {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: -SCREEN_WIDTH * 0.75,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
    setDrawerOpen(!drawerOpen);
  };

const handleConfirmDrop = async () => {
  const { latitude, longitude } = mapRegion;

  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${latitude}&lon=${longitude}&format=json`
    );
    const data = await res.json();
    const address = data.display_name || "";

    setDrop({ latitude, longitude, address });
    setConfirmed(true);

    // Fetch route from LocationIQ directions API
    fetchRoute({ latitude, longitude });
  } catch (e) {
    console.error("Failed to fetch drop address:", e);
    Alert.alert("Error", "Failed to fetch drop address");
  }
};


  const handleChangeDrop = () => {
    setConfirmed(false);
    setDrop(null);
    setRouteCoords([]);
    setDistance(null);
    setFare(null);
    setDropAddress("");
  };
const handleBookRide = async () => {
  if (!pickup || !drop || !fare) {
    Alert.alert("Error", "Pickup, drop, or fare missing!");
    return;
  }

    if (!user) {
    Alert.alert("Login Required", "You need to be logged in to book a ride.");
    return;
  }


  const { data, error } = await supabase
    .from("rides")
    .insert([{
      passenger_id: user.id,
      pickup_lat: pickup.latitude,
      pickup_lng: pickup.longitude,
      pickup_address: pickup.address,
      drop_lat: drop.latitude,
      drop_lng: drop.longitude,
      drop_address: drop.address,
      fare_estimate: fare,
      status: "pending",
    }])
    .select()
    .single();

  if (error) {
    console.error("Booking failed:", error);
    Alert.alert("Error", "Failed to book ride.");
    return;
  }

  setRideId(data.id);
  setRide(data);
  setConfirmed(true);

  // start 2 min countdown
  setCountdown(120);
  if (timerRef.current) clearInterval(timerRef.current);

  timerRef.current = setInterval(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        clearInterval(timerRef.current!);
        autoCancelIfNoDriver(); // auto cancel
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};
const autoCancelIfNoDriver = async () => {
  if (!rideId || !ride) return;

  if (ride.status === "pending") {
    console.log("⏳ Auto cancelling ride:", rideId);

    const { error } = await supabase
      .from("rides")
      .update({ status: "expired" })
      .eq("id", rideId);

    if (error) {
      console.error("Auto cancel failed:", error);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    resetRideState(); // clear ride state in UI
    Alert.alert(
      "No Driver Found",
      "Sorry, no drivers accepted your ride in time 😔. Please try again!"
    );
  }
};



const handleCancelRide = async () => {
  if (!rideId) return;

  console.log("Cancelling ride:", rideId);

  const { error } = await supabase
    .from("rides")
    .update({ status: "cancelled_by_passenger" })
    .eq("id", rideId);

  if (error) {
    console.error("Cancel failed:", error);
    Alert.alert("Error", "Could not cancel ride.");
    return;
  }

  if (timerRef.current) clearInterval(timerRef.current);

  resetRideState(); // <-- clear UI + state
  Alert.alert("Ride Cancelled", "You cancelled the ride.");
};


const resetRideState = () => {
  setRideId(null);
  setRide(null);
  setConfirmed(false);
  setDrop(null);
  setRouteCoords([]);
  setDistance(null);
  setFare(null);
  setCountdown(0);
};




useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.error(error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (drawerOpen) {
          toggleDrawer();
          return true;
        }
        Alert.alert("Logout", "Do you want to logout?", [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", onPress: handleLogout },
        ]);
        return true;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [drawerOpen])
  );
useEffect(() => {
  if (!rideId) return;

  const channel = supabase.channel("ride_" + rideId)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rides", filter: `id=eq.${rideId}` },
      (payload) => {
        const newRide = payload.new;
        console.log("Ride updated:", newRide);
        setRide(newRide);

        if (newRide.status === "accepted") {
          Alert.alert("Driver found!", "Your driver has accepted the ride.");
        }
        if (newRide.status === "arrived") {
          Alert.alert("Driver arrived!", "Please meet your driver.");
        }
        if (newRide.status === "in_progress") {
          Alert.alert("Ride Started", "Enjoy your trip.");
        }
        if (newRide.status === "completed") {
          Alert.alert("Ride Completed", "Thanks for riding!");
          setRideId(null);
        }
        if (newRide.status === "cancelled_by_driver" || newRide.status === "cancelled_by_passenger") {
          Alert.alert("Ride Cancelled", "Your ride was cancelled.");
          setRideId(null);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [rideId]);
const fullName =
  (user && "user_metadata" in user ? (user as any).user_metadata.full_name : null) ||
  user?.email ||
  "Guest";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleDrawer}>
          <Ionicons name="menu" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.locationBox}>
          <Ionicons name="location-sharp" size={20} color={theme.colors.primary} />
          <Text style={styles.locationText}>
  {pickup?.address || `Lat: ${pickup?.latitude.toFixed(4)}, Lon: ${pickup?.longitude.toFixed(4)}`}
</Text>


        </View>
      </View>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person-circle-outline" size={60} color="#ccc" />
          </View>
          <Text style={styles.drawerName}>{fullName}</Text>


        </View>
        <TouchableOpacity style={styles.drawerItem} onPress={() => router.push("/passenger/profile")}>
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
      {/* Overlay to close drawer */}
{drawerOpen && (
  <TouchableOpacity
    style={styles.overlay}
    activeOpacity={1}
    onPress={toggleDrawer} // closes drawer
  />
)}

      {/* Search Drop */}
      {/* Drop Location Box */}
<View style={styles.dropBox}>
  <MaterialIcons name="location-on" size={20} color="gray" />
  <Text style={styles.dropText}>
    {drop?.address || "Drop location not yet selected"}
  </Text>
</View>


      {/* Advertisement */}
      {adsTop.length > 0 && (
        <View style={styles.adBox}>
          <Text style={styles.adText}>{adsTop[0].title}</Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }} />
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={(region) => setMapRegion(region)}
            minZoomLevel={14}
            maxZoomLevel={18}
          >
            {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="green" />}
            {drop && <Marker coordinate={drop} title="Drop" pinColor="red" />}
            {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="blue" />}
          </MapView>
        )}

        {/* Center Marker */}
        {!confirmed && (
          <View pointerEvents="none" style={styles.centerMarker}>
            <Ionicons name="location-sharp" size={36} color="red" />
          </View>
        )}
      </View>

      {/* Booking Card */}
      <View style={styles.bookingCard}>
  {!confirmed ? (
    <TouchableOpacity
      style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
      onPress={handleConfirmDrop}
    >
      <Text style={styles.mainButtonText}>Confirm Drop</Text>
    </TouchableOpacity>
  ) : rideId && ride?.status === "pending" ? (
    <>
      <Text style={styles.info}>Searching for a driver...</Text>
      <Text style={styles.info}>Time left: {countdown}s</Text>

      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: "red" }]}
        onPress={handleCancelRide}
      >
        <Text style={styles.mainButtonText}>Cancel Ride</Text>
      </TouchableOpacity>
    </>
  ) : (
    <>
      <Text style={styles.info}>Distance: {distance?.toFixed(2)} km</Text>
      <Text style={styles.info}>Estimated Fare: ₹{fare}</Text>

      <TouchableOpacity
        style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleBookRide}
      >
        <Text style={styles.mainButtonText}>Instant Book</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.changeButton} onPress={handleChangeDrop}>
        <Text style={styles.changeButtonText}>Change Drop</Text>
      </TouchableOpacity>
    </>
  )}
</View>


      {/* Footer / Bottom Tabs */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab}>
          <Ionicons name="home-outline" size={24} />
          <Text>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab}>
          <Ionicons name="car-outline" size={24} />
          <Text>Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab}>
          <Ionicons name="wallet-outline" size={24} />
          <Text>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerTab}>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight! + 8 : 16,
    backgroundColor: "white",
    elevation: 4,
    zIndex: 10,
  },
  locationBox: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  locationText: { fontSize: 14, color: theme.colors.primary },
  overlay: {
  position: "absolute",
  top: 0,
  left: SCREEN_WIDTH * 0.75, // starts after drawer
  width: SCREEN_WIDTH * 0.25, // remaining 1/4
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.2)", // dim effect
  zIndex: 9, // slightly below drawer's zIndex
},
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
  drawerHeader: { alignItems: "center", marginBottom: 20 },
  profilePlaceholder: { marginBottom: 8 },
  drawerName: { fontWeight: "bold", fontSize: 16 },
  drawerItem: { paddingVertical: 12 },
  dropBox: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#eee",
  margin: theme.spacing.md,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  flexShrink: 1,            // allow box to shrink if needed
},
dropText: {
  marginLeft: 8,
  fontSize: 14,
  color: "#555",
  flexShrink: 1,            // allow text to shrink
  flexWrap: "wrap",         // wrap long text
},

  searchInput: { flex: 1, height: 40, paddingHorizontal: 8 },
  adBox: { height: 60, backgroundColor: "#fcebcf", justifyContent: "center", alignItems: "center", marginHorizontal: theme.spacing.md, borderRadius: 8, marginVertical: 4 },
  adText: { fontWeight: "bold" },
  mapContainer: { flex: 1, marginHorizontal: theme.spacing.md, borderRadius: 8, overflow: "hidden" },
  map: { flex: 1 },
  centerMarker: { position: "absolute", top: "50%", left: "50%", marginLeft: -18, marginTop: -36 },
  bookingCard: { padding: theme.spacing.md, backgroundColor: "white", margin: theme.spacing.md, borderRadius: 12, elevation: 12, alignItems: "center" },
  info: { fontSize: 16, marginBottom: 6, color: theme.colors.text },
  mainButton: { width: "100%", paddingVertical: 14, borderRadius: theme.borderRadius.md, alignItems: "center", marginTop: 12 },
  mainButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  changeButton: { marginTop: 8, paddingVertical: 10 },
  changeButtonText: { color: theme.colors.primary, fontSize: 14, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#ddd", backgroundColor: "white" },
  footerTab: { alignItems: "center" },
});
