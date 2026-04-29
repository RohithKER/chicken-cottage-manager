import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, View } from 'react-native';

interface StaffBadgeProps {
  name: string;
  color: string;
  onPress?: () => void;
  style?: ViewStyle;
  small?: boolean;
}

export function StaffBadge({ name, color, onPress, style, small }: StaffBadgeProps) {
  const textNode = (
    <Text
      style={[
        styles.badge,
        { backgroundColor: color },
        small && styles.badgeSmall,
        style as any,
      ]}
      numberOfLines={1}
    >
      {name}
    </Text>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {textNode}
      </TouchableOpacity>
    );
  }
  return <View style={styles.wrap}>{textNode}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
  badge: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 3,
    marginRight: 3,
  },
  badgeSmall: {
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
