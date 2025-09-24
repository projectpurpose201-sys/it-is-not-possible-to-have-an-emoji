import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { SessionProvider, useSession } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../utils/theme';

const InitialLayout = () => {
  const { session, loading, user } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (session && user) {
      const targetPath = user.role === 'driver' ? '/driver' : '/passenger';
      if (segments[0] !== user.role) {
        router.replace(targetPath);
      }
    } else if (!session && !inAuthGroup) {
      router.replace('/');
    }
  }, [session, loading, user, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    Lato_400Regular,
    Lato_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SessionProvider>
      <InitialLayout />
      <StatusBar style="light" />
    </SessionProvider>
  );
}
