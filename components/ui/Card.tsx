import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../utils/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style, 
  variant = 'default' 
}) => {
  return (
    <View style={[
      styles.card, 
      variant === 'glass' && styles.glassCard,
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  glassCard: {
    backgroundColor: theme.colors.glass,
    backdropFilter: 'blur(10px)',
  },
});
