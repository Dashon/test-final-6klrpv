/**
 * Professional Analytics Screen Component
 * Displays key performance metrics, revenue data, and user engagement statistics
 * with enhanced visualization and data management capabilities.
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, RefreshControl } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryPie,
  VictoryTooltip,
  VictoryVoronoiContainer
} from 'victory-native';
import { useSelector, useDispatch } from 'react-redux';
import useResponsive from '../../hooks/useResponsive';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { colors } from '../../constants/colors';

// Types and Interfaces
type TimeRange = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface AnalyticsData {
  revenue: number;
  revenueBreakdown: Record<string, number>;
  activeUsers: number;
  userSegmentation: Record<string, number>;
  averageRating: number;
  ratingDistribution: number[];
  totalConsultations: number;
  aiAgentInteractions: number;
  timeSeriesData: Array<{ date: string; value: number }>;
}

/**
 * Enhanced currency formatter with locale support
 */
const formatCurrency = (amount: number, locale = 'en-US', currency = 'USD'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Professional Analytics Screen Component
 */
const AnalyticsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { getSpacing, deviceType } = useResponsive();
  
  // State management
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Responsive chart dimensions
  const chartDimensions = useMemo(() => ({
    width: deviceType === 'tablet' ? 600 : 350,
    height: deviceType === 'tablet' ? 400 : 250,
  }), [deviceType]);

  /**
   * Fetch analytics data with error handling and caching
   */
  const fetchAnalyticsData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(!isRefreshing);
      // Actual API call would go here
      const response = await new Promise<AnalyticsData>((resolve) => {
        setTimeout(() => {
          resolve({
            revenue: 125000,
            revenueBreakdown: {
              'Consultations': 75000,
              'AI Agents': 35000,
              'Premium Features': 15000
            },
            activeUsers: 5200,
            userSegmentation: {
              'Regular': 3500,
              'Premium': 1200,
              'Enterprise': 500
            },
            averageRating: 4.7,
            ratingDistribution: [50, 150, 300, 2500, 2200],
            totalConsultations: 850,
            aiAgentInteractions: 12500,
            timeSeriesData: [
              { date: '2023-01', value: 95000 },
              { date: '2023-02', value: 102000 },
              { date: '2023-03', value: 125000 }
            ]
          });
        }, 1000);
      });

      setAnalyticsData(response);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTimeRange]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAnalyticsData(true);
  }, [fetchAnalyticsData]);

  /**
   * Revenue Chart Component
   */
  const RevenueChart = useMemo(() => (
    <Card elevation={2}>
      <Text style={styles.chartTitle}>Revenue Overview</Text>
      <VictoryChart
        width={chartDimensions.width}
        height={chartDimensions.height}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) => `${datum.date}\n${formatCurrency(datum.value)}`}
            labelComponent={<VictoryTooltip />}
          />
        }
      >
        <VictoryLine
          data={analyticsData?.timeSeriesData}
          x="date"
          y="value"
          style={{
            data: { stroke: colors.primary.default },
            parent: { border: "1px solid #ccc" }
          }}
          animate={{
            duration: 2000,
            onLoad: { duration: 1000 }
          }}
        />
      </VictoryChart>
    </Card>
  ), [analyticsData, chartDimensions]);

  /**
   * User Metrics Component
   */
  const UserMetrics = useMemo(() => (
    <Card elevation={2}>
      <Text style={styles.chartTitle}>User Engagement</Text>
      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analyticsData?.activeUsers}</Text>
          <Text style={styles.metricLabel}>Active Users</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analyticsData?.totalConsultations}</Text>
          <Text style={styles.metricLabel}>Consultations</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{analyticsData?.averageRating.toFixed(1)}</Text>
          <Text style={styles.metricLabel}>Avg. Rating</Text>
        </View>
      </View>
    </Card>
  ), [analyticsData]);

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  return (
    <ErrorBoundary>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
          />
        }
      >
        <View style={styles.content}>
          {RevenueChart}
          {UserMetrics}
        </View>
      </ScrollView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.text.primary,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.default,
  },
  metricLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
});

export default AnalyticsScreen;