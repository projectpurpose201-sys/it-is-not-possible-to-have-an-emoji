import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, MapViewProps } from "react-native-maps";

interface MapProps {
  pickup: { latitude: number; longitude: number; address?: string } | null;
  drop: { latitude: number; longitude: number } | null;
  routeCoords: { latitude: number; longitude: number }[];
  onLongPress?: (e: any) => void;
}

const VAN_REGION = {
  latitude: 12.6820, // Vaniyambadi center
  longitude: 78.6201,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Rough bounding box for Vaniyambadi
const BOUNDS = {
  north: 12.75,
  south: 12.62,
  east: 78.68,
  west: 78.55,
};

const Map: React.FC<MapProps> = ({ pickup, drop, routeCoords, onLongPress }) => {
  const mapRef = useRef<MapView>(null);

  const handleRegionChange: MapViewProps["onRegionChangeComplete"] = (region) => {
    const { latitude, longitude } = region;
    if (
      latitude > BOUNDS.north ||
      latitude < BOUNDS.south ||
      longitude > BOUNDS.east ||
      longitude < BOUNDS.west
    ) {
      mapRef.current?.animateToRegion(VAN_REGION, 500);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={VAN_REGION}
        minZoomLevel={14}
        maxZoomLevel={18}
        onRegionChangeComplete={handleRegionChange}
        moveOnMarkerPress={false}
        onLongPress={onLongPress}
      >
        {pickup && <Marker coordinate={pickup} title="Pickup" pinColor="green" />}
        {drop && <Marker coordinate={drop} title="Drop" pinColor="red" />}
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="blue" />
        )}
      </MapView>

      {/* Center marker */}
      <View pointerEvents="none" style={styles.centerMarker}>
        <View style={styles.centerDot} />
        <View style={styles.centerLine} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -12, // half of dot width
    marginTop: -24, // half of dot + half line
    alignItems: "center",
  },
  centerDot: {
    width: 24,
    height: 24,
    backgroundColor: "red",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "white",
    zIndex: 2,
  },
  centerLine: {
    width: 2,
    height: 24,
    backgroundColor: "red",
    marginTop: -2,
    zIndex: 1,
  },
});

export default Map;
