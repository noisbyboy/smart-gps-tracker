// File: app/index.tsx

import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import ActivityCard from '../components/ActivityCard';
import AnomalyPopup from '../components/AnomalyPopup';
import HistoryPolyline from '../components/HistoryPolyline';
import PredictionMarker from '../components/PredictionMarker';
import { GPSData, PredictionResponse } from '../utils/types';

// API Configuration
const API_BASE_URL = 'http://52.186.170.43:5000';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [location, setLocation] = useState<GPSData | null>(null);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [history, setHistory] = useState<GPSData[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [isConnected, setIsConnected] = useState(true); // Connection status

  useEffect(() => {
    navigation.setOptions({ title: 'TrackAI' });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
        setShowAlert(false);
      };
    }, [])
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (isScreenFocused) {
      // Fetch initial data immediately
      fetchPrediction();
      
      // Set interval to fetch new data every 5 seconds
      interval = setInterval(() => {
        fetchPrediction();
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isScreenFocused]);

  const fetchPrediction = async () => {
    try {
      console.log('Fetching from:', `${API_BASE_URL}/history?limit=10`);
      // Fetch latest GPS data from history
      const res = await fetch(`${API_BASE_URL}/history?limit=10`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      
      // Check if data exists
      if (!json.data || json.data.length === 0) {
        console.log("No GPS data available, using fallback");
        simulateFallbackData();
        return;
      }
      
      const latest = json.data[0];
      
      // Map API data format to expected format (handle both lat/lon and latitude/longitude)
      const mappedData = {
        lat: latest.lat || latest.latitude,
        lon: latest.lon || latest.longitude,
        speed: latest.speed || 0,
        timestamp: latest.timestamp || Date.now(),
      };
      
      // Validate mapped data structure
      if (!mappedData.lat || !mappedData.lon) {
        console.error("Invalid GPS data structure:", latest);
        simulateFallbackData();
        return;
      }

      // Call predict API with the latest GPS data
      const predictRes = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: mappedData.lat,
          lon: mappedData.lon,
          speed: mappedData.speed,
          timestamp: mappedData.timestamp,
        }),
      });

      if (!predictRes.ok) {
        throw new Error(`Predict API failed: ${predictRes.status}`);
      }

      const result: PredictionResponse = await predictRes.json();

      // Validate prediction response
      if (!result || !result.predicted_location) {
        console.error("Invalid prediction response:", result);
        return;
      }

      const gpsData: GPSData = {
        lat: mappedData.lat,
        lon: mappedData.lon,
        speed: mappedData.speed,
        timestamp: mappedData.timestamp,
      };

      setLocation(gpsData);
      
      // Add stable confidence based on activity type if not provided by API
      const getStableConfidence = (activity: string) => {
        switch (activity.toLowerCase()) {
          case 'stationary':
          case 'still': return 95; // High confidence for stationary
          case 'walking': return 88;
          case 'car':
          case 'driving': return 92;
          case 'cycling': return 85;
          case 'motor': return 90;
          default: return 75; // Lower confidence for unknown activities
        }
      };
      
      const predictionWithConfidence = {
        ...result,
        confidence: result.confidence_scores?.activity_confidence 
                    ? result.confidence_scores.activity_confidence * 100 // Convert to percentage
                    : getStableConfidence(result.activity || 'unknown')
      };
      
      setPrediction(predictionWithConfidence);
      setHistory((prev) => {
        // Avoid duplicate entries by checking timestamp
        const isDuplicate = prev.some(item => 
          item.timestamp === gpsData.timestamp && 
          item.lat === gpsData.lat && 
          item.lon === gpsData.lon
        );
        if (isDuplicate) return prev;
        
        // Keep only last 50 points to avoid memory issues
        const newHistory = [...prev, gpsData];
        return newHistory.slice(-50);
      });
      
      // More conservative anomaly detection - only show if speed is very unusual
      const isRealAnomaly = result.is_anomaly && (
        gpsData.speed > 120 || // Very high speed
        (gpsData.speed > 80 && result.activity === 'walking') || // Walking at high speed
        (gpsData.speed === 0 && result.activity === 'driving') // Driving with no speed
      );
      
      console.log('Anomaly check:', { 
        api_anomaly: result.is_anomaly, 
        speed: gpsData.speed, 
        activity: result.activity,
        final_anomaly: isRealAnomaly 
      });
      
      setShowAlert(isRealAnomaly);
      setIsConnected(true); // Set connected if fetch success
    } catch (err) {
      setIsConnected(false); // Set disconnected if fetch fails
      console.error("Failed to fetch prediction:", err);
      if (err instanceof Error) {
        console.error("Error details:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
      }
      simulateFallbackData();
    }
  };

  const simulateFallbackData = () => {
    const fallbackLocation: GPSData = {
      lat: -7.005, // Semarang coordinates instead of Jakarta
      lon: 110.438,
      speed: 0,
      timestamp: Date.now(),
    };

    const fallbackPrediction: PredictionResponse = {
      activity: 'stationary',
      confidence: 95, // High confidence for stationary fallback
      predicted_location: { lat: -7.0051, lon: 110.4381 }, // Small offset from Semarang
      is_anomaly: false, // Force false for fallback data
    };

    setLocation(fallbackLocation);
    setPrediction(fallbackPrediction);
    setHistory((prev) => {
      const isDuplicate = prev.some(item => 
        Math.abs(item.lat - fallbackLocation.lat) < 0.001 && 
        Math.abs(item.lon - fallbackLocation.lon) < 0.001
      );
      if (isDuplicate) return prev;
      return [...prev, fallbackLocation].slice(-50);
    });
    setShowAlert(false); // Never show anomaly alert for fallback data
  };

  useEffect(() => {
    navigation.setOptions({ 
      title: 'TrackAI',
      headerRight: () => (
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, {backgroundColor: isConnected ? '#2ecc40' : '#ff4136'}]} />
          <Text style={[styles.statusText, {color: isConnected ? '#2ecc40' : '#ff4136'}]}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      ),
    });
  }, [isConnected]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -7.005, // Default to Semarang coordinates
          longitude: 110.438,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={location && location.lat && location.lon ? {
          latitude: Number(location.lat),
          longitude: Number(location.lon),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : undefined}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        {location && location.lat && location.lon ? (
          <Marker
            key="current-location"
            coordinate={{ latitude: Number(location.lat), longitude: Number(location.lon) }}
            title="Posisi Saat Ini"
            description="Lokasi GPS terkini"
            pinColor="red"
          />
        ) : null}

        {prediction && prediction.predicted_location && prediction.predicted_location.lat && prediction.predicted_location.lon ? (
          <PredictionMarker 
            key="prediction-location"
            lat={Number(prediction.predicted_location.lat)}
            lng={Number(prediction.predicted_location.lon)}
          />
        ) : null}

        <HistoryPolyline key="history-polyline" history={history} />
      </MapView>

      {prediction && prediction.activity ? (
        <View key="activity-card-container" style={styles.activityCardContainer}>
          <ActivityCard 
            activity={String(prediction.activity || 'unknown')} 
            confidence={prediction.confidence}
            speed={location?.speed}
          />
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.fabButtonStats}
        onPress={() => router.push('/stats')}
      >
        <Text style={styles.fabButtonText}>📊</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/history')}
      >
        <Text style={styles.fabButtonText}>📋</Text>
      </TouchableOpacity>

      {showAlert ? <AnomalyPopup onClose={() => setShowAlert(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  activityCardContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center', // Center the ActivityCard horizontally
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabButtonStats: {
    position: 'absolute',
    bottom: 96, // Positioned above the history button (30 + 56 + 10 margin)
    right: 20,
    backgroundColor: '#34C759',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
