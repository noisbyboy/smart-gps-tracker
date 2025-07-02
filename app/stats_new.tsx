import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

const API_URL = 'http://52.186.170.43:5000/stats';
const API_BASE_URL = 'http://52.186.170.43:5000';
const { width } = Dimensions.get('window');

interface StatItem {
  activity?: string;
  count: number;
  is_anomaly?: boolean;
  avg_speed?: number;
}

// Interface untuk data mentah dari API
interface HistoryDataPoint {
  lat: number;
  lon: number;
  speed: number;
  timestamp: number;
  activity?: string;
}

// Interface untuk speed over time data
interface SpeedDataPoint {
  time: string;
  speed: number;
}

// Interface untuk today's summary
interface TodaySummary {
  totalDistance: number;
  totalDuration: number;
  dominantActivity: string;
  averageSpeed: number;
  tripCount: number;
}

interface StatsData {
  activity_distribution: StatItem[];
  anomaly_statistics: StatItem[];
  recent_activity: StatItem[];
  speed_by_activity: StatItem[];
  total_data_points: number;
  generated_at: string;
  
  // Data mentah untuk diolah
  rawHistoryData?: HistoryDataPoint[];
  
  // Data yang sudah diolah
  todaySummary?: TodaySummary;
  speedOverTime?: SpeedDataPoint[];
}

// Fungsi untuk mendapatkan icon berdasarkan aktivitas
const getActivityIcon = (activity: string) => {
  switch (activity.toLowerCase()) {
    case 'walking': return '🚶';
    case 'motor': return '🏍️';
    case 'car': return '🚗';
    case 'cycling': return '🚴';
    case 'stationary': return '⏸️';
    default: return '📍';
  }
};

// Fungsi untuk mendapatkan warna berdasarkan aktivitas
const getActivityColor = (activity: string) => {
  switch (activity.toLowerCase()) {
    case 'walking': return '#34C759';
    case 'motor': return '#FF9500';
    case 'car': return '#007AFF';
    case 'cycling': return '#AF52DE';
    case 'stationary': return '#8E8E93';
    default: return '#6c757d';
  }
};

// Activity Bar Chart component
const ActivityBarChart = ({ data }: { data: StatItem[] }) => {
  // Pastikan data terurut dan tidak kosong
  if (!data || data.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No activity data available</Text>
      </View>
    );
  }
  
  // Sort data by count (descending)
  const sortedData = [...data].sort((a, b) => (b.count || 0) - (a.count || 0));
  
  // Hitung total untuk persentase
  const total = sortedData.reduce((sum, item) => sum + (item.count || 0), 0);
  
  return (
    <View style={styles.barChartContainer}>
      {sortedData.map((item, index) => {
        const percentage = total > 0 ? ((item.count || 0) / total) * 100 : 0;
        const heightPercentage = Math.max(5, percentage); // minimum bar height 5%
        
        return (
          <View key={item.activity || `activity-${index}`} style={styles.barChartColumn}>
            <Text style={styles.barChartValue}>{item.count || 0}</Text>
            <View style={styles.barChartBarContainer}>
              <View 
                style={[
                  styles.barChartBar, 
                  { 
                    height: `${heightPercentage}%`,
                    backgroundColor: getActivityColor(item.activity || 'unknown')
                  }
                ]} 
              />
            </View>
            <Text style={styles.barChartLabel}>{getActivityIcon(item.activity || 'unknown')}</Text>
            <Text style={styles.barChartPercent}>{percentage.toFixed(1)}%</Text>
          </View>
        );
      })}
    </View>
  );
};

const StatsScreen = () => {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch stats data
      const statsRes = await fetch(API_URL);
      const statsJson = await statsRes.json();
      
      // 2. Fetch raw history data untuk today's summary dan speed over time
      const historyRes = await axios.get(`${API_BASE_URL}/history?limit=100`);
      let rawHistoryData: HistoryDataPoint[] = [];
      
      if (historyRes.data && historyRes.data.data) {
        rawHistoryData = historyRes.data.data;
      }
      
      // 3. Mendapatkan data untuk hari ini saja
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      
      const todayData = rawHistoryData.filter(item => 
        new Date(item.timestamp).getTime() >= todayTimestamp
      );
      
      // 4. Menghitung Today's Summary dari data asli
      const todaySummary = calculateTodaySummary(todayData);
      
      // 5. Membuat Speed Over Time dari data asli
      const speedOverTime = createSpeedOverTimeData(todayData);
      
      // 6. Menggabungkan semua data
      const enhancedData = {
        ...statsJson,
        rawHistoryData,
        todaySummary,
        speedOverTime
      };
      
      setStats(enhancedData);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fungsi untuk menghitung jarak antara dua koordinat GPS
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius bumi dalam km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fungsi untuk menghitung Today's Summary dari data asli
  const calculateTodaySummary = (todayData: HistoryDataPoint[]): TodaySummary => {
    if (!todayData || todayData.length === 0) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        dominantActivity: 'stationary',
        averageSpeed: 0,
        tripCount: 0
      };
    }
    
    // Hitung total distance
    let totalDistance = 0;
    for (let i = 1; i < todayData.length; i++) {
      const prevPoint = todayData[i-1];
      const currPoint = todayData[i];
      totalDistance += calculateDistance(prevPoint.lat, prevPoint.lon, currPoint.lat, currPoint.lon);
    }
    
    // Hitung durasi (dalam menit)
    const firstTimestamp = Math.min(...todayData.map(point => point.timestamp));
    const lastDataTimestamp = Math.max(...todayData.map(point => point.timestamp));
    const totalDuration = Math.ceil((lastDataTimestamp - firstTimestamp) / (1000 * 60)); // konversi ms ke menit
    
    // Temukan aktivitas dominan
    const activityCounts: Record<string, number> = {};
    todayData.forEach(point => {
      const activity = point.activity || 'unknown';
      activityCounts[activity] = (activityCounts[activity] || 0) + 1;
    });
    
    let dominantActivity = 'unknown';
    let maxCount = 0;
    Object.entries(activityCounts).forEach(([activity, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantActivity = activity;
      }
    });
    
    // Hitung kecepatan rata-rata
    const speeds = todayData.map(point => point.speed).filter(speed => speed > 0);
    const averageSpeed = speeds.length > 0 
      ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
      : 0;
    
    // Hitung jumlah trip
    // Anggap trip baru jika ada jeda > 10 menit (600000 ms)
    const TIME_GAP_MS = 600000; 
    let tripCount = 0;
    let prevTimestamp = 0;
    
    todayData.forEach(point => {
      if (prevTimestamp === 0 || (point.timestamp - prevTimestamp) > TIME_GAP_MS) {
        tripCount++;
      }
      prevTimestamp = point.timestamp;
    });
    
    return {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      totalDuration: Math.max(1, totalDuration), // minimum 1 menit
      dominantActivity: dominantActivity,
      averageSpeed: parseFloat(averageSpeed.toFixed(1)),
      tripCount: Math.max(1, tripCount) // minimum 1 trip
    };
  };

  // Fungsi untuk menghitung kecepatan maksimum dari data
  const calculateMaxSpeed = (historyData?: HistoryDataPoint[]): number => {
    if (!historyData || historyData.length === 0) return 0;
    
    // Filter data hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const todayData = historyData.filter(item => 
      item.timestamp >= todayTimestamp
    );
    
    if (todayData.length === 0) return 0;
    
    // Cari kecepatan maksimum
    const maxSpeed = Math.max(...todayData.map(point => point.speed || 0));
    return parseFloat(maxSpeed.toFixed(1));
  };
  
  // Fungsi untuk menghitung jumlah jam aktif (dengan data GPS) hari ini
  const calculateActiveHours = (historyData?: HistoryDataPoint[]): number => {
    if (!historyData || historyData.length === 0) return 0;
    
    // Filter data hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const todayData = historyData.filter(item => 
      item.timestamp >= todayTimestamp
    );
    
    if (todayData.length === 0) return 0;
    
    // Hitung jam unik dengan aktivitas
    const uniqueHours = new Set<number>();
    todayData.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      uniqueHours.add(hour);
    });
    
    return uniqueHours.size;
  };
  
  // Fungsi untuk menghitung rasio waktu bergerak vs diam
  const calculateMovingRatio = (historyData?: HistoryDataPoint[]): number => {
    if (!historyData || historyData.length === 0) return 0;
    
    // Filter data hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const todayData = historyData.filter(item => 
      item.timestamp >= todayTimestamp
    );
    
    if (todayData.length === 0) return 0;
    
    // Hitung titik data yang menunjukkan pergerakan (speed > 1 km/h)
    const movingPoints = todayData.filter(point => point.speed > 1).length;
    const totalPoints = todayData.length;
    
    // Hitung rasio dan konversi ke persentase
    const ratio = totalPoints > 0 ? (movingPoints / totalPoints) * 100 : 0;
    return Math.round(ratio);
  };

  // Fungsi untuk membuat Speed Over Time data dari data asli
  const createSpeedOverTimeData = (todayData: HistoryDataPoint[]): SpeedDataPoint[] => {
    if (!todayData || todayData.length === 0) {
      return [];
    }
    
    // Kelompokkan data berdasarkan jam
    const hourlyData: Record<number, number[]> = {};
    
    todayData.forEach(point => {
      const hour = new Date(point.timestamp).getHours();
      if (!hourlyData[hour]) hourlyData[hour] = [];
      hourlyData[hour].push(point.speed);
    });
    
    // Buat data point untuk setiap jam
    const result: SpeedDataPoint[] = [];
    
    // Pastikan ada data untuk setiap jam (jam 0-23)
    for (let hour = 0; hour < 24; hour++) {
      const speeds = hourlyData[hour] || [];
      const avgSpeed = speeds.length > 0 
        ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
        : 0;
      
      // Format jam sebagai string (00:00)
      const hourStr = hour.toString().padStart(2, '0');
      
      result.push({
        time: `${hourStr}:00`,
        speed: parseFloat(avgSpeed.toFixed(1))
      });
    }
    
    return result;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  const TrendIndicator = ({ label, current, previous, unit = '' }: {
    label: string;
    current: number;
    previous?: number;
    unit?: string;
  }) => {
    const trend = previous !== undefined ? current - previous : 0;
    const trendPercentage = previous !== undefined && previous > 0 ? ((trend / previous) * 100) : 0;
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    return (
      <View style={styles.trendContainer}>
        <Text style={styles.trendLabel}>{label}</Text>
        <View style={styles.trendValue}>
          <Text style={styles.trendNumber}>{current != null ? String(current) : 'N/A'}{unit}</Text>
          {!isNeutral && (
            <View style={[styles.trendBadge, { backgroundColor: isPositive ? '#34C759' : '#FF3B30' }]}>
              <Text style={styles.trendBadgeText}>
                {isPositive ? '↗' : '↘'} {Math.abs(trendPercentage).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getDataAge = (timestamp: string) => {
    const now = new Date();
    const dataTime = new Date(timestamp);
    const diffMs = now.getTime() - dataTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const StatCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardContent}>
        {children}
      </View>
    </View>
  );
  
  const StatRow = ({ label, value, icon }: { label: string; value: string | number; icon?: string }) => (
    <View style={styles.statRow}>
      <View style={styles.statLabel}>
        {icon && <Text style={styles.statIcon}>{icon}</Text>}
        <Text style={styles.statLabelText}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value != null ? String(value) : 'N/A'}</Text>
    </View>
  );

  const ProgressBar = ({ label, value, total, icon, color = '#007AFF' }: {
    label: string;
    value: number;
    total: number;
    icon?: string;
    color?: string;
  }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <View style={styles.progressLabel}>
            {icon && <Text style={styles.statIcon}>{icon}</Text>}
            <Text style={styles.progressLabelText}>{label}</Text>
          </View>
          <Text style={styles.progressValue}>{value != null ? String(value) : 'N/A'}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${percentage}%`, backgroundColor: color }
            ]} 
          />
        </View>
        <Text style={styles.progressPercentage}>{percentage.toFixed(1)}%</Text>
      </View>
    );
  };

  const MetricCard = ({ title, value, subtitle, icon, color = '#007AFF' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricIcon, { color }]}>{icon}</Text>
        <View style={styles.metricContent}>
          <Text style={styles.metricTitle}>{title}</Text>
          <Text style={[styles.metricValue, { color }]}>{value != null ? String(value) : 'N/A'}</Text>
          {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
  
  const DonutChart = ({ data, size = 120 }: {
    data: { label: string; value: number; color: string }[];
    size?: number;
  }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <View style={styles.donutContainer}>
        <View style={[styles.donutChart, { width: size, height: size }]}>
          <View style={[styles.donutCenter, { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 }]}>
            <Text style={styles.donutCenterText}>{total != null ? String(total) : '0'}</Text>
            <Text style={styles.donutCenterLabel}>Total</Text>
          </View>
          {data.length > 0 && (
            <View 
              style={[
                styles.donutSegment,
                { 
                  borderColor: data[0].color,
                  transform: [{ rotate: '0deg' }]
                }
              ]}
            />
          )}
          {data.length > 1 && (
            <View 
              style={[
                styles.donutSegment,
                { 
                  borderColor: data[1].color,
                  transform: [{ rotate: '180deg' }]
                }
              ]}
            />
          )}
        </View>
        <View style={styles.donutLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.label}: {item.value}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Today's Summary Widget menggunakan data asli
  const TodaySummaryWidget = () => {
    if (!stats?.todaySummary) return null;
    
    const { totalDistance, totalDuration, dominantActivity, averageSpeed, tripCount } = stats.todaySummary;
    const today = new Date();
    
    return (
      <View style={styles.todaySummaryCard}>
        <View style={styles.todayHeader}>
          <View style={styles.todayTitleContainer}>
            <Text style={styles.todayIcon}>📅</Text>
            <Text style={styles.todayTitle}>Today's Summary</Text>
          </View>
          <Text style={styles.todayDate}>{today.toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.todayMetrics}>
          <View style={styles.todayMetric}>
            <Text style={styles.todayMetricValue}>{totalDistance}</Text>
            <Text style={styles.todayMetricUnit}>km</Text>
            <Text style={styles.todayMetricLabel}>Distance</Text>
          </View>
          
          <View style={styles.todayMetric}>
            <Text style={styles.todayMetricValue}>{totalDuration}</Text>
            <Text style={styles.todayMetricUnit}>min</Text>
            <Text style={styles.todayMetricLabel}>Duration</Text>
          </View>
          
          <View style={styles.todayMetric}>
            <Text style={styles.todayMetricValue}>{getActivityIcon(dominantActivity)}</Text>
            <Text style={styles.todayMetricUnit}></Text>
            <Text style={styles.todayMetricLabel}>Main Activity</Text>
          </View>
          
          <View style={styles.todayMetric}>
            <Text style={styles.todayMetricValue}>{averageSpeed}</Text>
            <Text style={styles.todayMetricUnit}>km/h</Text>
            <Text style={styles.todayMetricLabel}>Avg Speed</Text>
          </View>
        </View>
        
        <View style={styles.tripInfo}>
          <Text style={styles.tripCount}>{tripCount} trips today</Text>
        </View>
      </View>
    );
  };

  // Speed Over Time Graph menggunakan data asli
  const SpeedOverTimeGraph = () => {
    const speedData = stats?.speedOverTime || [];
    
    if (speedData.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No speed data available for today</Text>
        </View>
      );
    }
    
    // Filter untuk tidak menampilkan semua 24 jam, hanya yang memiliki nilai > 0
    // atau sampel setiap 3 jam
    const filteredData = speedData.filter((point, index) => 
      point.speed > 0 || index % 3 === 0
    );
    
    const maxSpeed = Math.max(...speedData.map(d => d.speed));
    const chartHeight = 150;
    
    return (
      <View style={styles.speedChartContainer}>
        <Text style={styles.speedChartTitle}>Speed Over Time (Today)</Text>
        
        <View style={[styles.speedChart, { height: chartHeight }]}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            <Text style={styles.axisLabel}>{maxSpeed} km/h</Text>
            <Text style={styles.axisLabel}>{(maxSpeed / 2).toFixed(0)} km/h</Text>
            <Text style={styles.axisLabel}>0 km/h</Text>
          </View>
          
          {/* Chart area */}
          <View style={styles.chartArea}>
            {/* Horizontal grid lines */}
            <View style={[styles.gridLine, { top: 0 }]} />
            <View style={[styles.gridLine, { top: '50%' }]} />
            <View style={[styles.gridLine, { top: '100%' }]} />
            
            {/* Speed points and line */}
            <View style={styles.lineContainer}>
              {filteredData.map((point, index) => {
                const heightPercentage = maxSpeed > 0 ? (point.speed / maxSpeed) * 100 : 0;
                const position = index / (filteredData.length - 1) * 100;
                
                return (
                  <View 
                    key={`speed-${point.time}`} 
                    style={[
                      styles.speedPointContainer,
                      { 
                        left: `${position}%`
                      }
                    ]}
                  >
                    {/* Line segment */}
                    {index < filteredData.length - 1 && (
                      <View 
                        style={[
                          styles.lineSegment,
                          {
                            width: `${(100 / (filteredData.length - 1))}%`,
                            bottom: `${heightPercentage}%`,
                            backgroundColor: point.speed > 30 ? '#FF9500' : point.speed > 10 ? '#007AFF' : '#34C759'
                          }
                        ]} 
                      />
                    )}
                    
                    {/* Speed point */}
                    <View 
                      style={[
                        styles.speedPoint, 
                        { 
                          bottom: `${heightPercentage}%`,
                          backgroundColor: point.speed > 30 ? '#FF9500' : point.speed > 10 ? '#007AFF' : '#34C759'
                        }
                      ]} 
                    />
                    
                    {/* X-axis time label */}
                    <Text style={styles.timeLabel}>{point.time}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
        
        {/* Legend */}
        <View style={styles.speedLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>High Speed (30+ km/h)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
            <Text style={styles.legendText}>Medium Speed (10-30 km/h)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Low Speed (0-10 km/h)</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load statistics</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentWrapper}>
        {/* Key Metrics Overview pada posisi paling atas */}
        <View style={styles.metricsRow}>
          <MetricCard
            title="Total Points"
            value={stats.total_data_points}
            icon="📊"
            color="#007AFF"
          />
          <MetricCard
            title="Max Speed"
            value={`${calculateMaxSpeed(stats.rawHistoryData)} km/h`}
            subtitle="today"
            icon="🚀"
            color="#34C759"
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            title="Active Hours"
            value={calculateActiveHours(stats.rawHistoryData)}
            subtitle="today"
            icon="⏱️"
            color="#FF9500"
          />
          <MetricCard
            title="Moving Ratio"
            value={`${calculateMovingRatio(stats.rawHistoryData)}%`}
            subtitle="time in motion"
            icon="📱"
            color="#5856D6"
          />
        </View>
        
        {/* Today's Summary Widget dipindahkan ke bawah metrik */}
        <TodaySummaryWidget />

        {/* NEW: Speed Over Time Graph */}
        <StatCard title="Speed Over Time" icon="📈">
          <SpeedOverTimeGraph />
        </StatCard>

        {/* NEW: Activity Distribution Bar Chart (replaces progress bars) */}
        <StatCard title="Activity Distribution" icon="🧩">
          {stats.activity_distribution && stats.activity_distribution.length > 0 ? (
            <ActivityBarChart data={stats.activity_distribution} />
          ) : (
            <Text style={styles.noDataText}>No activity data available</Text>
          )}
        </StatCard>

        {/* Anomaly Statistics with Visual Chart */}
        <StatCard title="Anomaly Detection" icon="⚠️">
          {stats.anomaly_statistics && stats.anomaly_statistics.length > 0 ? (
            <DonutChart
              data={stats.anomaly_statistics.map((item: StatItem, index: number) => ({
                label: item.is_anomaly ? 'Anomaly' : 'Normal',
                value: item.count,
                color: item.is_anomaly ? '#FF3B30' : '#34C759'
              }))}
            />
          ) : (
            <Text style={styles.noDataText}>No anomaly data available</Text>
          )}
        </StatCard>

        {/* Recent Activities */}
        <StatCard title="Last 24 Hours" icon="🕒">
          {stats.recent_activity && stats.recent_activity.length > 0 ? (
            stats.recent_activity.map((item: StatItem) => (
              <StatRow
                key={item.activity || 'unknown'}
                icon={getActivityIcon(item.activity || 'unknown')}
                label={item.activity || 'Unknown'}
                value={item.count}
              />
            ))
          ) : (
            <Text style={styles.noDataText}>No recent activity data</Text>
          )}
        </StatCard>

        {/* Speed by Activity */}
        <StatCard title="Average Speed by Activity" icon="🚀">
          {stats.speed_by_activity && stats.speed_by_activity.length > 0 ? (
            stats.speed_by_activity.map((item: StatItem) => (
              <StatRow
                key={item.activity || 'unknown'}
                icon={getActivityIcon(item.activity || 'unknown')}
                label={item.activity || 'Unknown'}
                value={`${item.avg_speed?.toFixed(1) || '0.0'} km/h`}
              />
            ))
          ) : (
            <Text style={styles.noDataText}>No speed data available</Text>
          )}
        </StatCard>

        {/* Data Summary and System Status */}
        <StatCard title="System Status" icon="💻">
          <StatRow
            icon="📌"
            label="Total Data Points"
            value={stats.total_data_points}
          />
          <StatRow
            icon="🕒"
            label="Data Age"
            value={getDataAge(stats.generated_at)}
          />
          <StatRow
            icon="📡"
            label="System Status"
            value="Active"
          />
          <View style={styles.generatedAt}>
            <Text style={styles.generatedAtText}>
              Last updated: {new Date(stats.generated_at).toLocaleString()}
            </Text>
          </View>
        </StatCard>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentWrapper: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  cardContent: {
    width: '100%',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statLabelText: {
    fontSize: 15,
    color: '#212529',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabelText: {
    fontSize: 14,
    color: '#212529',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 2,
  },
  trendContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trendLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginRight: 8,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  donutContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  donutChart: {
    position: 'relative',
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 20,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  donutCenter: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  donutCenterText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  donutCenterLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  donutLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#212529',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  noDataContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    padding: 16,
  },
  generatedAt: {
    marginTop: 16,
    alignItems: 'center',
  },
  generatedAtText: {
    fontSize: 12,
    color: '#6c757d',
  },

  // NEW STYLES for Today's Summary
  todaySummaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  todayDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  todayMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  todayMetric: {
    alignItems: 'center',
    flex: 1,
  },
  todayMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  todayMetricUnit: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  todayMetricLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  tripInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'center',
  },
  tripCount: {
    fontSize: 14,
    color: '#212529',
  },

  // NEW STYLES for Bar Chart
  barChartContainer: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  barChartColumn: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 60,
  },
  barChartValue: {
    fontSize: 12,
    color: '#212529',
    fontWeight: '600',
    marginBottom: 4,
  },
  barChartBarContainer: {
    width: '50%',
    height: 100,
    justifyContent: 'flex-end',
  },
  barChartBar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barChartLabel: {
    fontSize: 16,
    marginTop: 8,
  },
  barChartPercent: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },

  // NEW STYLES for Speed Chart
  speedChartContainer: {
    marginVertical: 8,
  },
  speedChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  speedChart: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    marginBottom: 12,
  },
  yAxisLabels: {
    width: 60,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  chartArea: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  lineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  speedPointContainer: {
    position: 'absolute',
    bottom: 0,
    width: 1,
    alignItems: 'center',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    zIndex: 1,
  },
  speedPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  timeLabel: {
    fontSize: 10,
    color: '#6c757d',
    position: 'absolute',
    bottom: -20,
    width: 40,
    textAlign: 'center',
    transform: [{ translateX: -20 }],
  },
  speedLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 24,
  },
});

export default StatsScreen;
