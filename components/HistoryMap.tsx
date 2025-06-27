// File: components/HistoryMap.tsx

import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { GPSData } from '../utils/types';
import HistoryPolyline from './HistoryPolyline';
import { ThemedText } from './ThemedText';

interface HistoryMapProps {
  history: GPSData[];
}

const HistoryMap: React.FC<HistoryMapProps> = ({ history }) => {
  const initialRegion = history.length > 0 ? {
    latitude: history[0].lat,
    longitude: history[0].lon,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: -6.2,
    longitude: 106.8,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText>No route history available</ThemedText>
        </View>
      ) : (
        <MapView style={styles.map} initialRegion={initialRegion}>
          <HistoryPolyline history={history} />
        </MapView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HistoryMap;