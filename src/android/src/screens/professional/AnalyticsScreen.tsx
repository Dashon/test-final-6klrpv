/**
 * @fileoverview Professional analytics screen component for Android
 * @version 1.0.0
 * 
 * Displays performance metrics, revenue data, and user engagement statistics
 * for travel professionals with real-time updates and offline support.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  AccessibilityInfo,
  useColorScheme,
  Platform,
  NetInfo
} from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryVoronoiContainer
} from 'victory-native'; // v36.x
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { get, retryWithBackoff } from '../../services/api';
import { colors } from '../../constants/colors';
import { Spacing, Layout } from '../../constants/layout';

// Interfaces
interface AnalyticsData {
  revenue: number[];
  bookings: number[];
  userEngagement: number[];
  consultations: number[];
  lastSyncTimestamp: number;
}

interface ChartConfig {
  dataKey: keyof AnalyticsData;
  title: string;
  color: string;
  accessibilityLabel: string;
}

// Chart configurations
const CHART_CONFIGS: ChartConfig[] = [
  {
    dataKey: 'revenue',
    title: 'Monthly Revenue',
    color: colors.primary.default,
    accessibilityLabel: 'Monthly revenue trend chart'
  },
  {
    dataKey: 'bookings',
    title: 'Booking Count',
    color: colors.secondary.default,
    accessibilityLabel: 'Monthly booking count trend chart'
  },
  {
    dataKey: 'userEngagement',
    title: 'User Engagement',
    color: colors.success.default,
    accessibilityLabel: 'Monthly user engagement trend chart'
  },
  {
    dataKey: 'consultations',
    title: 'Consultations',
    color: colors.warning.default,
    accessibilityLabel: 'Monthly consultation count trend chart'
  }
];

const AnalyticsScreen: React.FC = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  // Fetch analytics data with retry mechanism and offline support
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await retryWithBackoff(() =>
        get<AnalyticsData>('/api/v1/professional/analytics')
      );
      setAnalyticsData(data);
      setError(null);
      
      // Cache data for offline access
      await AsyncStorage.setItem('analytics_cache', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      setError(err as Error);
      // Load cached data if available
      const cached = await AsyncStorage.getItem('analytics_cache');
      if (cached) {
        const { data } = JSON.parse(cached);
        setAnalyticsData(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized chart rendering function
  const renderChart = useCallback(({ dataKey, title, color, accessibilityLabel }: ChartConfig) => {
    if (!analyticsData) return null;

    const data = analyticsData[dataKey].map((value, index) => ({
      x: index + 1,
      y: value
    }));

    return (
      <View 
        style={styles.chartContainer}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
      >
        <Text style={[
          styles.chartTitle,
          isDarkMode && { color: colors.text.darkMode.primary }
        ]}>
          {title}
        </Text>
        <VictoryChart
          height={220}
          padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => `${title}: ${datum.y}`}
              voronoiDimension="x"
            />
          }
        >
          <VictoryAxis
            tickFormat={(t) => `M${t}`}
            style={{
              axis: { stroke: isDarkMode ? colors.border.darkMode.default : colors.border.default },
              tickLabels: { 
                fill: isDarkMode ? colors.text.darkMode.secondary : colors.text.secondary 
              }
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: isDarkMode ? colors.border.darkMode.default : colors.border.default },
              tickLabels: { 
                fill: isDarkMode ? colors.text.darkMode.secondary : colors.text.secondary 
              }
            }}
          />
          <VictoryLine
            data={data}
            style={{
              data: { stroke: color }
            }}
            animate={{
              duration: 500,
              onLoad: { duration: 500 }
            }}
          />
        </VictoryChart>
      </View>
    );
  }, [analyticsData, isDarkMode]);

  // Network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Initial data fetch and refresh interval
  useEffect(() => {
    fetchAnalyticsData();
    const refreshInterval = setInterval(fetchAnalyticsData, 300000); // 5 minutes

    return () => clearInterval(refreshInterval);
  }, [fetchAnalyticsData]);

  // Accessibility configuration
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility('Analytics dashboard loaded');
  }, []);

  if (loading && !analyticsData) {
    return <LoadingSpinner fullscreen accessibilityLabel="Loading analytics data" />;
  }

  return (
    <View style={[
      styles.container,
      isDarkMode && { backgroundColor: colors.background.darkMode.primary }
    ]}>
      {isOffline && (
        <Text style={[
          styles.offlineNotice,
          isDarkMode && { color: colors.text.darkMode.primary }
        ]}>
          You're offline. Showing cached data.
        </Text>
      )}
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <Text style={[
            styles.errorText,
            isDarkMode && { color: colors.error.darkMode.text }
          ]}>
            {error.message}
          </Text>
        )}
        
        {CHART_CONFIGS.map((config) => renderChart(config))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  scrollContainer: {
    flex: 1
  },
  contentContainer: {
    padding: Spacing.md
  },
  chartContainer: {
    marginVertical: Spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: Spacing.md,
    elevation: 2,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    color: colors.text.primary
  },
  offlineNotice: {
    backgroundColor: colors.warning.surface,
    color: colors.warning.text,
    padding: Spacing.sm,
    textAlign: 'center'
  },
  errorText: {
    color: colors.error.text,
    padding: Spacing.md,
    textAlign: 'center'
  }
});

export default AnalyticsScreen;