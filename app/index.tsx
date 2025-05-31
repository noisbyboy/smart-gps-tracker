// File: app/index.tsx

import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import ActivityCard from '../components/ActivityCard';
import AnomalyPopup from '../components/AnomalyPopup';
import HistoryPolyline from '../components/HistoryPolyline';
import PredictionMarker from '../components/PredictionMarker';
import api from '../utils/api';
import { GPSData, PredictionResponse } from '../utils/types';

export default function HomeScreen() {
  const [location, setLocation] = useState<GPSData | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [history, setHistory] = useState<GPSData[]>([]);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get<PredictionResponse>('/predict');
      const data = res.data;

      const currentLocation: GPSData = {
        lat: data.predicted_location.lat,
        lon: data.predicted_location.lon,
        speed: 0,
        timestamp: Date.now(),
      };

      setLocation(currentLocation);
      setPrediction(data);
      setHistory((prev) => [...prev, currentLocation]);
      setShowAlert(data.is_anomaly);
    } catch (error) {
      console.error('Fetch failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -6.2,
          longitude: 106.8,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {location && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lon }}
            title="Posisi Saat Ini"
            pinColor="blue"
          />
        )}

        {prediction && (
          <PredictionMarker lat={prediction.predicted_location.lat} lng={prediction.predicted_location.lon} />
        )}

        <HistoryPolyline history={history} />
      </MapView>

      {prediction && <ActivityCard activity={prediction.activity} />}
      {showAlert && prediction && (
        <AnomalyPopup onClose={() => setShowAlert(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
