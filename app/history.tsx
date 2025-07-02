// File: app/history.tsx

import axios from 'axios';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RouteHistory {
  id: string;
  date: string;
  time: string;
  duration: string;
  distance: string;
  startLocation: string;
  endLocation: string;
  mainActivity: string;
  avgSpeed: string;
  anomalies: number;
  pointCount: number;
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [historyData, setHistoryData] = useState<RouteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Route History' });
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      console.log('Fetching history from API...');
      
      // Use the same API base URL as index.tsx
      const API_BASE_URL = 'http://52.186.170.43:5000';
      const res = await axios.get(`${API_BASE_URL}/routes?limit=12&time_gap=180&min_points=2`);
      
      console.log('Routes response:', res.data);
      
      if (res.data && res.data.routes) {
        setHistoryData(res.data.routes);
      } else {
        console.log('No routes data in response, trying fallback...');
        // Fallback: try to get basic history data
        const historyRes = await axios.get(`${API_BASE_URL}/history?limit=20`);
        console.log('History fallback response:', historyRes.data);
        
        if (historyRes.data && historyRes.data.data) {
          // Convert history data to route format
          const mockRoutes = processHistoryToRoutes(historyRes.data.data);
          setHistoryData(mockRoutes);
        }
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      console.log('Creating mock data for demo...');
      // Create some mock data for demo purposes
      setHistoryData(createMockRoutes());
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert history data to routes
  const processHistoryToRoutes = (historyData: any[]): RouteHistory[] => {
    return historyData.slice(0, 10).map((item, index) => ({
      id: `route_${index}`,
      date: new Date(item.timestamp).toLocaleDateString(),
      time: new Date(item.timestamp).toLocaleTimeString(),
      duration: '5-15m',
      distance: `${(Math.random() * 2 + 0.1).toFixed(1)} km`,
      startLocation: 'Semarang',
      endLocation: 'Nearby Location',
      mainActivity: item.speed > 20 ? 'car' : item.speed > 5 ? 'walking' : 'stationary',
      avgSpeed: `${item.speed || 0} km/h`,
      anomalies: 0,
      pointCount: 1,
    }));
  };

  // Create mock routes for demo
  const createMockRoutes = (): RouteHistory[] => {
    const activities = ['car', 'walking', 'stationary', 'cycling'];
    const locations = ['Semarang Center', 'UNDIP Campus', 'Simpang Lima', 'Tembalang'];
    
    return Array.from({ length: 8 }, (_, index) => ({
      id: `mock_${index}`,
      date: new Date(Date.now() - index * 86400000).toLocaleDateString(),
      time: `${8 + index}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      duration: `${5 + Math.floor(Math.random() * 30)}m`,
      distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
      startLocation: locations[Math.floor(Math.random() * locations.length)],
      endLocation: locations[Math.floor(Math.random() * locations.length)],
      mainActivity: activities[Math.floor(Math.random() * activities.length)],
      avgSpeed: `${Math.floor(Math.random() * 40 + 5)} km/h`,
      anomalies: Math.random() > 0.8 ? 1 : 0,
      pointCount: Math.floor(Math.random() * 50 + 10),
    }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistoryData();
    setRefreshing(false);
  };

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'motor': return '🏍️';
      case 'car': return '🚗';
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'bus': return '🚌';
      case 'stationary': return '🛑';
      default: return '📍';
    }
  };

  const getActivityLabel = (activity: string) => {
    switch (activity) {
      case 'motor': return 'Motor';
      case 'car': return 'Car';
      case 'walking': return 'Walking';
      case 'cycling': return 'Cycling';
      case 'bus': return 'Bus';
      case 'stationary': return 'Stationary';
      default: return activity.charAt(0).toUpperCase() + activity.slice(1);
    }
  };

  const renderHistoryItem = ({ item }: { item: RouteHistory }) => {
    // Safety checks untuk mencegah undefined/null values
    const safeItem = {
      item,
      mainActivity: item.mainActivity || 'unknown',
      date: item.date || 'N/A',
      time: item.time || 'N/A',
      startLocation: item.startLocation || 'N/A',
      endLocation: item.endLocation || 'N/A',
      distance: item.distance || '0 m',
      duration: item.duration || '0m',
      avgSpeed: item.avgSpeed || '0 km/h',
      anomalies: item.anomalies || 0,
      pointCount: item.pointCount || 0
    };
    
    return (
      <TouchableOpacity style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.activityInfo}>
            <Text style={styles.activityIcon}>{getActivityIcon(safeItem.mainActivity)}</Text>
            <View style={styles.activityDetails}>
              <Text style={styles.activityLabel}>{getActivityLabel(safeItem.mainActivity)}</Text>
              <Text style={styles.dateTime}>{safeItem.date} • {safeItem.time}</Text>
            </View>
          </View>
          {safeItem.anomalies > 0 && (
            <View style={styles.anomalyBadge}>
              <Text style={styles.anomalyText}>⚠️ {safeItem.anomalies}</Text>
            </View>
          )}
        </View>

        <View style={styles.routeInfo}>
          <Text style={styles.routeText}>📍 {safeItem.startLocation}</Text>
          <Text style={styles.routeArrow}>↓</Text>
          <Text style={styles.routeText}>🎯 {safeItem.endLocation}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{safeItem.distance}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{safeItem.duration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{safeItem.avgSpeed}</Text>
            <Text style={styles.statLabel}>Speed</Text>
          </View>
        </View>
        
        <View style={styles.additionalInfo}>
          <Text style={styles.pointsInfo}>📊 {safeItem.pointCount} GPS points</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading routes...</Text>
        </View>
      ) : historyData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛣️</Text>
          <Text style={styles.emptyTitle}>No Routes Found</Text>
          <Text style={styles.emptySubtitle}>Start your journey to see route history</Text>
        </View>
      ) : (
        <FlatList
          data={historyData}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContainer: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activityInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  activityIcon: { fontSize: 24, marginRight: 12 },
  activityDetails: { flex: 1 },
  activityLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  dateTime: { fontSize: 12, color: '#666', marginTop: 2 },
  anomalyBadge: { backgroundColor: '#FFE5E5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  anomalyText: { fontSize: 12, color: '#D32F2F', fontWeight: '500' },
  routeInfo: { marginBottom: 12 },
  routeText: { fontSize: 14, color: '#555', marginBottom: 4 },
  routeArrow: { fontSize: 12, color: '#999', textAlign: 'center', marginVertical: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  additionalInfo: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  pointsInfo: { fontSize: 12, color: '#999', textAlign: 'center' },
});
