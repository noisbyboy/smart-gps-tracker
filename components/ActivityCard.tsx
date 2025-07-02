// File: components/ActivityCard.tsx

import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ActivityCardProps {
  activity: string;
  confidence?: number; // Optional confidence level (0-100)
  speed?: number; // Speed in km/h
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, confidence, speed }) => {
  // Safety check untuk memastikan activity tidak null/undefined
  const safeActivity = activity || 'unknown';
  const safeConfidence = confidence || 0;
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
    <BlurView intensity={80} tint="light" style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getActivityIcon(safeActivity)}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>Activity</Text>
        <Text style={styles.activity}>{getActivityLabel(safeActivity)}</Text>
        {confidence && confidence > 0 && (
          <Text style={styles.confidence}>
            {confidence.toFixed(0)}% confident
          </Text>
        )}
        {typeof speed === 'number' && (
          <Text style={styles.speed}>{speed.toFixed(1)} km/h</Text>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    overflow: 'hidden', // Important for BlurView border radius
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
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
    color: 'rgba(0, 0, 0, 0.6)',
    marginBottom: 2,
  },
  activity: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.85)',
  },
  confidence: {
    fontSize: 11,
    color: '#005EB8',
    marginTop: 1,
    fontWeight: '500',
  },
  speed: {
    fontSize: 13,
    color: '#1B9C2F',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default ActivityCard;
