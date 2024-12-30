/**
 * Test Suite for AnalyticsChart Component
 * Version: 1.0.0
 * 
 * Comprehensive tests for the professional analytics visualization component
 * covering rendering, data handling, interactions, and error scenarios.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import AnalyticsChart from './AnalyticsChart';
import { getAgentAnalytics } from '../../../services/professional';
import type { AgentAnalytics } from '../../../types/professional';

// Mock the professional service
jest.mock('../../../services/professional');

// Mock recharts to handle SVG rendering in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="responsive-container">{children}</div>,
  Line: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="line-chart">{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="bar-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="pie-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Cell: () => <div data-testid="pie-cell" />
}));

/**
 * Generates mock analytics data for testing
 */
const mockAnalyticsData = (chartType: 'line' | 'bar' | 'pie'): AgentAnalytics => {
  const baseData: AgentAnalytics = {
    totalSessions: 150,
    averageRating: 4.8,
    totalRevenue: 15000,
    activeSubscribers: 45,
    metrics: {
      conversionRate: 0.25,
      retentionRate: 0.85
    }
  };

  // Add historical data based on chart type
  if (chartType === 'line' || chartType === 'bar') {
    baseData.historicalData = Array.from({ length: 7 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      revenue: 1000 + Math.random() * 500,
      sessions: 20 + Math.random() * 10
    }));
  }

  return baseData;
};

/**
 * Common test setup function
 */
const setupTest = (props = {}) => {
  const defaultProps = {
    agentId: 'test-agent-123',
    chartType: 'line' as const,
    timeRange: 'week' as const,
    theme: 'light' as const,
    height: 400,
    width: '100%',
    className: 'custom-chart',
    ...props
  };

  return {
    user: userEvent.setup(),
    ...render(<AnalyticsChart {...defaultProps} />)
  };
};

describe('AnalyticsChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    setupTest();
    
    const loadingElement = screen.getByRole('status');
    expect(loadingElement).toBeInTheDocument();
    expect(loadingElement).toHaveTextContent('Loading analytics data...');
  });

  it('renders line chart with data correctly', async () => {
    const mockData = mockAnalyticsData('line');
    (getAgentAnalytics as jest.Mock).mockResolvedValueOnce(mockData);
    
    setupTest();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    const chart = screen.getByTestId('line-chart');
    expect(chart).toBeInTheDocument();
    
    // Verify chart components
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('renders bar chart with data correctly', async () => {
    const mockData = mockAnalyticsData('bar');
    (getAgentAnalytics as jest.Mock).mockResolvedValueOnce(mockData);
    
    setupTest({ chartType: 'bar' });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders pie chart with data correctly', async () => {
    const mockData = mockAnalyticsData('pie');
    (getAgentAnalytics as jest.Mock).mockResolvedValueOnce(mockData);
    
    setupTest({ chartType: 'pie' });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('handles error state appropriately', async () => {
    const errorMessage = 'Failed to fetch analytics data';
    (getAgentAnalytics as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
    
    setupTest();

    await waitFor(() => {
      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(errorMessage);
    });
  });

  it('updates data when timeRange prop changes', async () => {
    const mockData = mockAnalyticsData('line');
    (getAgentAnalytics as jest.Mock).mockResolvedValueOnce(mockData);
    
    const { rerender } = setupTest();

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    // Update timeRange prop
    const newMockData = mockAnalyticsData('line');
    (getAgentAnalytics as jest.Mock).mockResolvedValueOnce(newMockData);
    
    rerender(
      <AnalyticsChart
        agentId="test-agent-123"
        chartType="line"
        timeRange="month"
        theme="light"
        height={400}
        width="100%"
      />
    );

    await waitFor(() => {
      expect(getAgentAnalytics).toHaveBeenCalledTimes(2);
    });
  });

  it('applies theme-specific styling', async () => {
    const mockData = mockAnalyticsData('line');
    (getAgentAnalytics as jest.Mock).mockResolvedValueOnce(mockData);
    
    setupTest({ theme: 'dark' });

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    const chartContainer = screen.getByRole('region');
    expect(chartContainer).toHaveClass('analytics-chart');
  });

  it('handles WebSocket updates correctly', async () => {
    const mockData = mockAnalyticsData('line');
    (getAgentAnalytics as jest.Mock)
      .mockResolvedValueOnce(mockData)
      .mockResolvedValueOnce({ ...mockData, totalRevenue: 20000 });

    setupTest();

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    // Simulate WebSocket message
    const ws = new WebSocket('ws://localhost:1234');
    ws.onmessage({ data: JSON.stringify({ agentId: 'test-agent-123' }) } as MessageEvent);

    await waitFor(() => {
      expect(getAgentAnalytics).toHaveBeenCalledTimes(2);
    });
  });
});