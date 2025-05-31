// File: components/ActivityCard.tsx

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ActivityCardProps {
  activity: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Aktivitas:</Text>
      <Text style={styles.activity}>{activity.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#888',
  },
  activity: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default ActivityCard;
