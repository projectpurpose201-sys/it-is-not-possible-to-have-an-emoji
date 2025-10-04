import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";


// 🛣️ Function to fetch directions from Google Directions API
async function getDirections(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
  const originStr = `${origin.latitude},${origin.longitude}`;
  const destStr = `${destination.latitude},${destination.longitude}`;
  const LOCATIONIQ_API_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY;
  try {
    const resp = await fetch(
  `https://us1.locationiq.com/v1/directions/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?key=${LOCATIONIQ_API_KEY}&overview=full&geometries=polyline`
);

const json = await resp.json();

if (json.routes && json.routes.length) {
  const points = decodePolyline(json.routes[0].geometry);
  return points.map((p: any) => ({
    latitude: p[0],
    longitude: p[1],
  }));
}

    return [];
  } catch (e) {
    console.error("Error fetching directions:", e);
    return [];
  }
}

// 🔑 Polyline decoder
function decodePolyline(t: string) {
  let points = [];
  let index = 0,
    len = t.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = t.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export default function RideScreen() {
  const { rideId } = useLocalSearchParams();
  const router = useRouter();

  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);

  // 🚗 Fetch ride from DB
  const fetchRide = async () => {
    if (!rideId) {
      Alert.alert("Error", "No rideId provided!");
      router.replace("/driver");
      return;
    }
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("id", rideId)
      .single();

    if (error) console.error(error);
    else setRide(data);
  };

  useEffect(() => {
    fetchRide();
  }, [rideId]);

  // 📍 Watch driver location & update route
  useEffect(() => {
    let subscription: any;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Enable location to continue.");
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 20, // update every 20 meters
        },
        async (loc) => {
          const newLocation = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setCurrentLocation(newLocation);

          // 🔄 update polyline depending on ride status
          if (ride) {
            if (["accepted", "arrived"].includes(ride.status)) {
              const coords = await getDirections(newLocation, {
                latitude: ride.pickup_lat,
                longitude: ride.pickup_lng,
              });
              setRouteCoords(coords);
            } else if (ride.status === "in_progress") {
              const coords = await getDirections(newLocation, {
                latitude: ride.drop_lat,
                longitude: ride.drop_lng,
              });
              setRouteCoords(coords);
            }
          }
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [ride]);

  // 🔄 Update ride status
  const updateStatus = async (status: string) => {
    if (!rideId) return;
    setLoading(true);
    const { error } = await supabase
      .from("rides")
      .update({ status })
      .eq("id", rideId);
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setRide((prev: any) => ({ ...prev, status }));
      if (status === "completed" || status === "cancelled") {
        router.replace("/driver");
      }
    }
  };

  if (!ride) {
    return (
      <View style={styles.center}>
        <Text>Loading ride...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🗺️ Map */}
      <MapView
        style={styles.map}
        region={{
          latitude: currentLocation?.latitude || ride.pickup_lat,
          longitude: currentLocation?.longitude || ride.pickup_lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Driver"
            pinColor="blue"
          />
        )}

        <Marker
          coordinate={{ latitude: ride.pickup_lat, longitude: ride.pickup_lng }}
          title="Pickup"
          pinColor="green"
        />

        {ride.drop_lat && ride.drop_lng && (
          <Marker
            coordinate={{ latitude: ride.drop_lat, longitude: ride.drop_lng }}
            title="Drop"
            pinColor="red"
          />
        )}

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="blue"
          />
        )}
      </MapView>

      {/* 📋 Ride Info */}
      <View style={styles.infoBox}>
        <Text style={styles.title}>Ride Details</Text>
        <Text>Passenger: {ride.passenger_name || "Unknown"}</Text>
        <Text>Phone: {ride.passenger_phone || "N/A"}</Text>
        <Text>Pickup: {ride.pickup_address}</Text>
        <Text>Drop: {ride.drop_address}</Text>
        <Text>Status: {ride.status}</Text>

        {/* Action button */}
        {ride.status === "accepted" && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => updateStatus("arrived")}
          >
            <Text style={styles.buttonText}>Mark as Arrived</Text>
          </TouchableOpacity>
        )}
        {ride.status === "arrived" && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => updateStatus("in_progress")}
          >
            <Text style={styles.buttonText}>Start Ride</Text>
          </TouchableOpacity>
        )}
        {ride.status === "in_progress" && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "red" }]}
            onPress={() => updateStatus("completed")}
          >
            <Text style={styles.buttonText}>End Ride</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#555" }]}
          onPress={() =>
            Alert.alert("Cancel Ride", "Are you sure?", [
              { text: "No" },
              { text: "Yes, Cancel", onPress: () => updateStatus("cancelled") },
            ])
          }
        >
          <Text style={styles.buttonText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  infoBox: {
    padding: 16,
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  button: {
    backgroundColor: "#007bff",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
