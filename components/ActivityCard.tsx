// File: components/ActivityCard.tsx

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ActivityCardProps {
  activity: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  // Safety check untuk memastikan activity tidak null/undefined
  const safeActivity = activity || 'unknown';
  const getActivityIcon = (activityType: string) => {
    switch (activityType.toLowerCase()) {
      case 'motor':
      case 'motorcycle':
        return '🏍️';
      case 'car':
      case 'driving':
        return '🚗';
      case 'walking':
      case 'walk':
        return '🚶';
      case 'running':
      case 'run':
        return '🏃';
      case 'cycling':
      case 'bike':
        return '🚴';
      case 'still':
      case 'stationary':
        return '⏸️';
      default:
        return '📍';
    }
  };

  const getActivityLabel = (activityType: string) => {
    switch (activityType.toLowerCase()) {
      case 'motor':
      case 'motorcycle':
        return 'Motor';
      case 'car':
      case 'driving':
        return 'Car';
      case 'walking':
      case 'walk':
        return 'Walking';
      case 'running':
      case 'run':
        return 'Running';
      case 'cycling':
      case 'bike':
        return 'Cycling';
      case 'bus':
        return 'Bus';
      case 'train':
        return 'Train';
      case 'still':
      case 'stationary':
        return 'Stationary';
      default:
        return activityType.charAt(0).toUpperCase() + activityType.slice(1);
    }
  };

  return (
    <View style={styles.card}>      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getActivityIcon(safeActivity)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>Activity</Text>
        <Text style={styles.activity}>{getActivityLabel(safeActivity)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 160,
    maxWidth: 200,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  activity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default ActivityCard;
