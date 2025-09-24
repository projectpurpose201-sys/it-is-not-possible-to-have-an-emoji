// app/passenger/_layout.tsx
import { Stack } from "expo-router";

export default function PassengerLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false  }} />
      <Stack.Screen name="book-ride" options={{ title: "Book Ride" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="ride-history" options={{ title: "Ride History" }} />
      <Stack.Screen name="ride-tracking" options={{ title: "Ride Tracking" }} />
    </Stack>
  );
}
