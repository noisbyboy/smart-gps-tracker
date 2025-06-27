import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

const API_URL = 'http://192.168.18.41:5000/stats';
const { width } = Dimensions.get('window');

interface StatItem {
  activity?: string;
  count: number;
  is_anomaly?: boolean;
  avg_speed?: number;
}

interface StatsData {
  activity_distribution: StatItem[];
  anomaly_statistics: StatItem[];
  recent_activity: StatItem[];
  speed_by_activity: StatItem[];
  total_data_points: number;
  generated_at: string;
}

const StatsScreen = () => {  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      setStats(json);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };
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
  const getActivityColor = (activity: string) => {
    switch (activity.toLowerCase()) {
      case 'walking': return '#34C759';
      case 'motor': return '#FF9500';
      case 'car': return '#007AFF';
      case 'cycling': return '#AF52DE';
      case 'stationary': return '#8E8E93';
      default: return '#6c757d';
    }
  };  const TrendIndicator = ({ label, current, previous, unit = '' }: {
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
          <Text style={styles.trendNumber}>{current}{unit}</Text>
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
      <Text style={styles.statValue}>{value}</Text>
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
          <Text style={styles.progressValue}>{value}</Text>
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
          <Text style={[styles.metricValue, { color }]}>{value}</Text>
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
          {/* Simple circular visualization */}
          <View style={[styles.donutCenter, { width: size * 0.5, height: size * 0.5, borderRadius: size * 0.25 }]}>
            <Text style={styles.donutCenterText}>{total}</Text>
            <Text style={styles.donutCenterLabel}>Total</Text>
          </View>
          {/* Outer ring representing the largest value */}
          {data.length > 0 && (
            <View 
              style={[
                styles.donutSegment,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: 15,
                  borderColor: data[0].color,
                  opacity: 0.3
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
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load statistics</Text>
      </View>
    );
  }
  return (    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentWrapper}>
        {/* Key Metrics Overview */}
        <View style={styles.metricsRow}>
        <MetricCard
          title="Total Points"
          value={stats.total_data_points}
          icon="📊"
          color="#007AFF"
        />
        <MetricCard
          title="Activities"
          value={stats.activity_distribution?.length || 0}
          subtitle="types"
          icon="🚶"
          color="#34C759"
        />
      </View>

      <View style={styles.metricsRow}>
        <MetricCard
          title="Anomalies"
          value={stats.anomaly_statistics?.find(item => item.is_anomaly)?.count || 0}
          subtitle="detected"
          icon="⚠️"
          color="#FF3B30"
        />
        <MetricCard
          title="Avg Speed"
          value={stats.speed_by_activity && stats.speed_by_activity.length > 0 
            ? `${(stats.speed_by_activity.reduce((sum, item) => sum + (item.avg_speed || 0), 0) / stats.speed_by_activity.length).toFixed(1)}`
            : '0.0'
          }
          subtitle="km/h"
          icon="🚀"
          color="#FF9500"
        />
      </View>{/* Activity Distribution with Progress Bars */}
      <StatCard title="Activity Distribution" icon="🚶">
        {stats.activity_distribution && stats.activity_distribution.length > 0 ? (
          stats.activity_distribution.map((item: StatItem) => {
            const totalActivities = stats.activity_distribution?.reduce((sum, a) => sum + a.count, 0) || 1;
            return (
              <ProgressBar
                key={item.activity || 'unknown'}
                label={item.activity || 'Unknown'}
                value={item.count}
                total={totalActivities}
                icon={getActivityIcon(item.activity || 'unknown')}
                color={getActivityColor(item.activity || 'unknown')}
              />
            );
          })
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
      </StatCard>      {/* Data Summary and System Status */}
      <StatCard title="System Status" icon="�">
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
        />        <View style={styles.generatedAt}>
          <Text style={styles.generatedAtText}>
            Last updated: {new Date(stats.generated_at).toLocaleString()}
          </Text>
        </View>
      </StatCard>
      </View> {/* End contentWrapper */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingTop: 20,  },
  contentWrapper: {
    paddingTop: 16,
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
    color: '#6c757d',  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#343a40',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  statLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  statLabelText: {
    fontSize: 16,
    color: '#495057',
    textTransform: 'capitalize',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  generatedAt: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  generatedAtText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 2,
  },
  // Progress Bar
  progressContainer: {
    marginVertical: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressLabelText: {
    fontSize: 14,
    color: '#495057',
    textTransform: 'capitalize',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
  },
  // Donut Chart
  donutContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  donutChart: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutSegment: {
    position: 'absolute',
  },
  donutCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 30,
  },
  donutCenterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  donutCenterLabel: {
    fontSize: 10,
    color: '#6c757d',
  },
  donutLegend: {
    alignItems: 'flex-start',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },  legendText: {
    fontSize: 14,
    color: '#495057',
  },  // No data message
  noDataText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // Trend Indicator
  trendContainer: {
    paddingVertical: 8,
  },
  trendLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  trendValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default StatsScreen;
