import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { theme } from "../../utils/theme";

export default function ActiveRideScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Active Ride</Text>
        <Text style={styles.rideText}>Ride ID: {rideId}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: theme.colors.primary },
  rideText: { fontSize: 18, marginTop: 10 },
});
