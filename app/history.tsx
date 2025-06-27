// File: app/history.tsx

import axios from 'axios';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
}

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [historyData, setHistoryData] = useState<RouteHistory[]>([]);

  useEffect(() => {
    navigation.setOptions({ title: 'Route History' });
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      const res = await axios.get('http://192.168.18.41:5000/routes');
      setHistoryData(res.data.routes || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'motor': return '🏍️';
      case 'car': return '🚗';
      case 'walking': return '🚶';
      case 'cycling': return '🚴';
      case 'bus': return '🚌';
      default: return '📍';
    }
  };

  const getActivityLabel = (activity: string) => {
    switch (activity) {
      case 'motor': return 'Motor';
      case 'car': return 'Mobil';
      case 'walking': return 'Jalan';
      case 'cycling': return 'Sepeda';
      case 'bus': return 'Bus';
      default: return activity;
    }
  };

  const renderHistoryItem = ({ item }: { item: RouteHistory }) => (
    <TouchableOpacity style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <View style={styles.activityInfo}>
          <Text style={styles.activityIcon}>{getActivityIcon(item.mainActivity)}</Text>
          <View style={styles.activityDetails}>
            <Text style={styles.activityLabel}>{getActivityLabel(item.mainActivity)}</Text>
            <Text style={styles.dateTime}>{item.date} • {item.time}</Text>
          </View>
        </View>
        {item.anomalies > 0 && (
          <View style={styles.anomalyBadge}>
            <Text style={styles.anomalyText}>⚠️ {item.anomalies}</Text>
          </View>
        )}
      </View>

      <View style={styles.routeInfo}>
        <Text style={styles.routeText}>📍 {item.startLocation}</Text>
        <Text style={styles.routeArrow}>↓</Text>
        <Text style={styles.routeText}>🎯 {item.endLocation}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.distance}</Text>
          <Text style={styles.statLabel}>Jarak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.duration}</Text>
          <Text style={styles.statLabel}>Durasi</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.avgSpeed}</Text>
          <Text style={styles.statLabel}>Kecepatan</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  listContainer: { padding: 16 },
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
});
