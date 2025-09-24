import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';

export const theme = {
  colors: {
    primary: '#1976D2',      // Classic blue
    secondary: '#0D47A1',    // Darker navy blue
    accent: '#E3F2FD',       // Light blue accent
    background: '#FFFFFF',   // White background
    surface: '#F8F9FA',      // Light surface (cards, containers)
    card: '#FFFFFF',         // White cards
    text: '#212121',         // Almost black text
    textSecondary: '#555555',// Gray secondary text
    border: '#DDDDDD',       // Subtle border
    success: '#2E7D32',      // Green success
    warning: '#ED6C02',      // Orange warning
    error: '#D32F2F',        // Red error
    glass: 'rgba(255, 255, 255, 0.85)', // Light glass
    overlay: 'rgba(0, 0, 0, 0.5)',      // Dim overlay
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    heading1: {
      fontFamily: 'PlayfairDisplay_700Bold',
      fontSize: 34,
      lineHeight: 42,
      color: '#212121',
    },
    heading2: {
      fontFamily: 'PlayfairDisplay_700Bold',
      fontSize: 26,
      lineHeight: 34,
      color: '#212121',
    },
    heading3: {
      fontFamily: 'Lato_700Bold',
      fontSize: 20,
      lineHeight: 28,
      color: '#212121',
    },
    body: {
      fontFamily: 'Lato_400Regular',
      fontSize: 16,
      lineHeight: 24,
      color: '#212121',
    },
    bodySmall: {
      fontFamily: 'Lato_400Regular',
      fontSize: 14,
      lineHeight: 20,
      color: '#555555',
    },
    caption: {
      fontFamily: 'Lato_400Regular',
      fontSize: 12,
      lineHeight: 16,
      color: '#555555',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 6,
    },
  },
};
