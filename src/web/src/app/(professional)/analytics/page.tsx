'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { debounce } from 'lodash'; // ^4.17.21
import AnalyticsChart from '../../../components/professional/AnalyticsChart/AnalyticsChart';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { selectAnalytics, selectLoading, selectError } from '../../../store/slices/professionalSlice';

// Constants for analytics configuration
const ANALYTICS_UPDATE_INTERVAL = 60000; // 1 minute
const ANALYTICS_DEBOUNCE_DELAY = 500; // 500ms
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.aitravelplatform.com/ws';

/**
 * Professional Analytics Dashboard Page Component
 * Displays comprehensive analytics data with real-time updates
 */
const AnalyticsPage: React.FC = () => {
  const dispatch = useDispatch();
  const analytics = useSelector(selectAnalytics);
  const isLoading = useSelector(selectLoading);
  const error = useSelector(selectError);

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    connectionQuality, 
    sendMessage, 
    subscribe, 
    unsubscribe 
  } = useWebSocket({
    url: `${WEBSOCKET_URL}/analytics`,
    autoConnect: true,
    enableHeartbeat: true,
    onQualityChange: (quality) => {
      console.log('WebSocket connection quality:', quality);
    }
  });

  // Memoized chart configurations
  const chartConfigs = useMemo(() => ({
    revenue: {
      chartType: 'line' as const,
      timeRange: 'month' as const,
      height: 400
    },
    consultations: {
      chartType: 'bar' as const,
      timeRange: 'week' as const,
      height: 300
    },
    agentPerformance: {
      chartType: 'pie' as const,
      timeRange: 'month' as const,
      height: 300
    }
  }), []);

  /**
   * Debounced analytics data fetch to prevent excessive API calls
   */
  const fetchAnalyticsData = useCallback(
    debounce(async (timeRange: string) => {
      try {
        const response = await fetch(`/api/professional/analytics?timeRange=${timeRange}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const data = await response.json();
        // Dispatch analytics update action here
      } catch (err) {
        console.error('Analytics fetch error:', err);
      }
    }, ANALYTICS_DEBOUNCE_DELAY),
    []
  );

  /**
   * Handles real-time analytics updates via WebSocket
   */
  const handleWebSocketUpdate = useCallback((data: any) => {
    if (data.type === 'analytics_update') {
      // Dispatch analytics update action here
    }
  }, []);

  // Set up WebSocket subscription and polling
  useEffect(() => {
    if (isConnected) {
      subscribe('analytics_update', handleWebSocketUpdate);
    }

    const intervalId = setInterval(() => {
      fetchAnalyticsData('all');
    }, ANALYTICS_UPDATE_INTERVAL);

    return () => {
      unsubscribe('analytics_update', handleWebSocketUpdate);
      clearInterval(intervalId);
      fetchAnalyticsData.cancel();
    };
  }, [isConnected, subscribe, unsubscribe, handleWebSocketUpdate, fetchAnalyticsData]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData('all');
  }, [fetchAnalyticsData]);

  if (error) {
    return (
      <div 
        className="analytics-error" 
        role="alert" 
        aria-live="polite"
      >
        <h2>Error Loading Analytics</h2>
        <p>{error.message}</p>
        <button 
          onClick={() => fetchAnalyticsData('all')}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <main className="analytics-dashboard" role="main">
      <header className="analytics-header">
        <h1>Professional Analytics Dashboard</h1>
        <div className="connection-status" aria-live="polite">
          {isConnected ? (
            <span className="status-connected">Live Updates Active</span>
          ) : (
            <span className="status-disconnected">Updates Paused</span>
          )}
        </div>
      </header>

      <div className="analytics-grid">
        {/* Revenue Analytics */}
        <section 
          className="analytics-section revenue"
          aria-labelledby="revenue-heading"
        >
          <h2 id="revenue-heading">Revenue Overview</h2>
          <AnalyticsChart
            agentId="all"
            {...chartConfigs.revenue}
            className="revenue-chart"
          />
        </section>

        {/* Consultation Analytics */}
        <section 
          className="analytics-section consultations"
          aria-labelledby="consultations-heading"
        >
          <h2 id="consultations-heading">Consultation Metrics</h2>
          <AnalyticsChart
            agentId="all"
            {...chartConfigs.consultations}
            className="consultations-chart"
          />
        </section>

        {/* Agent Performance Analytics */}
        <section 
          className="analytics-section agent-performance"
          aria-labelledby="performance-heading"
        >
          <h2 id="performance-heading">Agent Performance</h2>
          <AnalyticsChart
            agentId="all"
            {...chartConfigs.agentPerformance}
            className="performance-chart"
          />
        </section>

        {/* Key Metrics Summary */}
        <section 
          className="analytics-section metrics-summary"
          aria-labelledby="metrics-heading"
        >
          <h2 id="metrics-heading">Key Metrics</h2>
          <div className="metrics-grid">
            {isLoading ? (
              <div className="loading-skeleton" aria-busy="true">
                Loading metrics...
              </div>
            ) : (
              <>
                <div className="metric-card" role="region" aria-label="Total Revenue">
                  <h3>Total Revenue</h3>
                  <p className="metric-value">${analytics?.totalRevenue || 0}</p>
                </div>
                <div className="metric-card" role="region" aria-label="Active Clients">
                  <h3>Active Clients</h3>
                  <p className="metric-value">{analytics?.activeClients || 0}</p>
                </div>
                <div className="metric-card" role="region" aria-label="Consultation Rate">
                  <h3>Consultation Rate</h3>
                  <p className="metric-value">{analytics?.consultationRate || 0}%</p>
                </div>
                <div className="metric-card" role="region" aria-label="Average Rating">
                  <h3>Average Rating</h3>
                  <p className="metric-value">{analytics?.averageRating || 0}/5</p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AnalyticsPage;