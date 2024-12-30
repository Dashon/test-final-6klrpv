/**
 * Professional Analytics Chart Component
 * Version: 1.0.0
 * 
 * A responsive and accessible chart component for displaying professional analytics
 * with support for multiple visualization types and real-time updates.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Line,
  Bar,
  Pie,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts'; // ^2.7.2
import { debounce } from 'lodash'; // ^4.17.21
import { AgentAnalytics } from '../../../types/professional';
import { getAgentAnalytics } from '../../../services/professional';

// Chart type definitions
export type ChartType = 'line' | 'bar' | 'pie';
export type TimeRange = 'day' | 'week' | 'month' | 'year';
export type Theme = 'light' | 'dark';

interface AnalyticsChartProps {
  agentId: string;
  chartType: ChartType;
  timeRange: TimeRange;
  theme?: Theme;
  height?: number;
  width?: number;
  className?: string;
}

interface ChartConfig {
  colors: string[];
  fontFamily: string;
  fontSize: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

/**
 * Formats currency values with proper locale and currency symbol
 */
const formatCurrency = (value: number, currency = 'USD', locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Calculates growth rate between two periods
 */
const calculateGrowthRate = (
  currentValue: number,
  previousValue: number,
  asPercentage = true
): number => {
  if (previousValue === 0) return 0;
  const rate = ((currentValue - previousValue) / previousValue);
  return asPercentage ? rate * 100 : rate;
};

/**
 * Main analytics chart component with real-time updates and accessibility support
 */
export const AnalyticsChart: React.FC<AnalyticsChartProps> = React.memo(({
  agentId,
  chartType,
  timeRange,
  theme = 'light',
  height = 400,
  width = '100%',
  className
}) => {
  // State management
  const [analyticsData, setAnalyticsData] = useState<AgentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chart configuration based on theme
  const chartConfig: ChartConfig = useMemo(() => ({
    colors: theme === 'light' 
      ? ['#1A73E8', '#34A853', '#FBBC04', '#EA4335']
      : ['#81D4FA', '#A5D6A7', '#FFE082', '#EF9A9A'],
    fontFamily: 'Roboto, sans-serif',
    fontSize: 12,
    padding: { top: 20, right: 20, bottom: 20, left: 20 }
  }), [theme]);

  /**
   * Fetches analytics data with debouncing and error handling
   */
  const fetchAnalyticsData = useCallback(debounce(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const timeRangeMap = {
        day: { startDate: new Date(Date.now() - 86400000), granularity: 'hour' },
        week: { startDate: new Date(Date.now() - 604800000), granularity: 'day' },
        month: { startDate: new Date(Date.now() - 2592000000), granularity: 'day' },
        year: { startDate: new Date(Date.now() - 31536000000), granularity: 'month' }
      };

      const { startDate, granularity } = timeRangeMap[timeRange];
      
      const data = await getAgentAnalytics(agentId, {
        startDate,
        endDate: new Date(),
        granularity: granularity as 'hour' | 'day' | 'week' | 'month'
      });

      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, 500), [agentId, timeRange]);

  // Initial data fetch and refresh setup
  useEffect(() => {
    fetchAnalyticsData();

    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/analytics`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.agentId === agentId) {
        fetchAnalyticsData();
      }
    };

    return () => {
      ws.close();
    };
  }, [agentId, timeRange, fetchAnalyticsData]);

  /**
   * Renders appropriate chart based on type with accessibility support
   */
  const renderChart = useCallback(() => {
    if (!analyticsData) return null;

    const commonProps = {
      data: analyticsData.historicalData,
      margin: chartConfig.padding,
      style: { fontFamily: chartConfig.fontFamily }
    };

    switch (chartType) {
      case 'line':
        return (
          <Line {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={chartConfig.colors[0]}
              activeDot={{ r: 8 }}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke={chartConfig.colors[1]}
              name="Sessions"
            />
          </Line>
        );

      case 'bar':
        return (
          <Bar {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Legend />
            <Bar
              dataKey="revenue"
              fill={chartConfig.colors[0]}
              name="Revenue"
            />
            <Bar
              dataKey="sessions"
              fill={chartConfig.colors[1]}
              name="Sessions"
            />
          </Bar>
        );

      case 'pie':
        const pieData = [
          { name: 'Revenue', value: analyticsData.totalRevenue },
          { name: 'Active Subscribers', value: analyticsData.activeSubscribers },
          { name: 'Total Sessions', value: analyticsData.totalSessions }
        ];
        return (
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill={chartConfig.colors[0]}
            label
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={chartConfig.colors[index % chartConfig.colors.length]} />
            ))}
          </Pie>
        );

      default:
        return null;
    }
  }, [analyticsData, chartType, chartConfig]);

  if (error) {
    return (
      <div className="analytics-chart-error" role="alert">
        Error: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="analytics-chart-loading" role="status">
        Loading analytics data...
      </div>
    );
  }

  return (
    <div 
      className={`analytics-chart ${className || ''}`}
      style={{ height, width }}
      role="region"
      aria-label="Analytics Chart"
    >
      <ResponsiveContainer>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
});

AnalyticsChart.displayName = 'AnalyticsChart';

export default AnalyticsChart;