// components/driver/RideRequests.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Card } from "../../components/ui/Card";

type Ride = {
  id: string;
  pickup_address: string;
  drop_address: string;
  fare_estimate: number;
};

type Props = {
  rides: Ride[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
};

export default function RideRequests({ rides, onAccept, onReject }: Props) {
  if (rides.length === 0) return null;

  return (
    <FlatList
      data={rides}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.title}>🚖 New Ride Request</Text>
          <Text>Pickup: {item.pickup_address}</Text>
          <Text>Drop: {item.drop_address}</Text>
          <Text>Fare: ₹{item.fare_estimate}</Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "green" }]}
              onPress={() => onAccept(item.id)}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "red" }]}
              onPress={() => onReject(item.id)}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { marginVertical: 8, padding: 16 },
  title: { fontWeight: "bold", marginBottom: 8, fontSize: 16 },
  row: { flexDirection: "row", marginTop: 10 },
  btn: { flex: 1, padding: 12, marginHorizontal: 5, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});
