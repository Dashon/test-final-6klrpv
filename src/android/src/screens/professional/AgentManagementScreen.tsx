/**
 * @fileoverview Professional dashboard screen for AI agent management
 * @version 1.0.0
 * 
 * Implements a comprehensive interface for professionals to create, manage,
 * and monitor AI agents with advanced filtering, analytics, and batch operations.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useColorScheme
} from 'react-native';
import { get, post, put } from '../../services/api';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import AndroidStatusBar from '../../components/shared/AndroidStatusBar';
import { colors } from '../../constants/colors';
import { Spacing, Layout } from '../../constants/layout';
import { getResponsiveSize } from '../../utils/responsive';

// Types for agent management
interface AIAgent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
  type: string;
  createdAt: string;
  lastActive: string;
  metrics: {
    conversations: number;
    rating: number;
    revenue: number;
  };
}

interface AgentFilter {
  status?: string;
  type?: string;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface AgentAnalytics {
  totalRevenue: number;
  averageRating: number;
  activeConversations: number;
}

/**
 * Professional Agent Management Screen Component
 */
const AgentManagementScreen: React.FC = () => {
  // State management
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<AgentFilter>({});
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Theme handling
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  /**
   * Fetches AI agents with applied filters
   */
  const fetchAgents = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      const response = await get<AIAgent[]>('/professional/agents', {
        params: {
          ...filters,
          page: 1,
          limit: 20
        }
      });

      setAgents(response);
      await fetchAnalytics();
    } catch (err) {
      setError('Failed to load agents. Please try again.');
      console.error('[AgentManagement] Error fetching agents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  /**
   * Fetches analytics data for agents
   */
  const fetchAnalytics = async () => {
    try {
      const data = await get<AgentAnalytics>('/professional/agents/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error('[AgentManagement] Error fetching analytics:', err);
    }
  };

  /**
   * Handles batch operations on selected agents
   */
  const handleBatchOperation = async (operation: 'activate' | 'deactivate' | 'delete') => {
    if (!selectedAgents.length) return;

    try {
      setLoading(true);
      await post('/professional/agents/batch', {
        operation,
        agentIds: selectedAgents
      });

      setSelectedAgents([]);
      await fetchAgents(false);
    } catch (err) {
      setError(`Failed to ${operation} agents. Please try again.`);
      console.error('[AgentManagement] Batch operation error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles agent selection for batch operations
   */
  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(current => 
      current.includes(agentId)
        ? current.filter(id => id !== agentId)
        : [...current, agentId]
    );
  };

  // Initial data fetch
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  /**
   * Renders individual agent item
   */
  const renderAgentItem = useCallback(({ item: agent }: { item: AIAgent }) => (
    <TouchableOpacity
      style={[
        styles.agentCard,
        isDarkMode && styles.agentCardDark,
        selectedAgents.includes(agent.id) && styles.selectedCard
      ]}
      onPress={() => toggleAgentSelection(agent.id)}
      onLongPress={() => toggleAgentSelection(agent.id)}
    >
      <View style={styles.agentHeader}>
        <Text style={[styles.agentName, isDarkMode && styles.textLight]}>
          {agent.name}
        </Text>
        <View style={[styles.statusBadge, styles[`status${agent.status}`]]}>
          <Text style={styles.statusText}>{agent.status}</Text>
        </View>
      </View>

      <Text style={[styles.agentDescription, isDarkMode && styles.textLight]}>
        {agent.description}
      </Text>

      <View style={styles.metricsContainer}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, isDarkMode && styles.textLight]}>
            {agent.metrics.conversations}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.textLight]}>
            Conversations
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, isDarkMode && styles.textLight]}>
            {agent.metrics.rating.toFixed(1)}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.textLight]}>
            Rating
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, isDarkMode && styles.textLight]}>
            ${agent.metrics.revenue.toFixed(2)}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.textLight]}>
            Revenue
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [selectedAgents, isDarkMode]);

  /**
   * Renders analytics summary
   */
  const renderAnalytics = useMemo(() => {
    if (!analytics) return null;

    return (
      <View style={[styles.analyticsContainer, isDarkMode && styles.analyticsContainerDark]}>
        <Text style={[styles.analyticsTitle, isDarkMode && styles.textLight]}>
          Analytics Overview
        </Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticItem}>
            <Text style={[styles.analyticValue, isDarkMode && styles.textLight]}>
              ${analytics.totalRevenue.toFixed(2)}
            </Text>
            <Text style={[styles.analyticLabel, isDarkMode && styles.textLight]}>
              Total Revenue
            </Text>
          </View>
          <View style={styles.analyticItem}>
            <Text style={[styles.analyticValue, isDarkMode && styles.textLight]}>
              {analytics.averageRating.toFixed(1)}
            </Text>
            <Text style={[styles.analyticLabel, isDarkMode && styles.textLight]}>
              Avg Rating
            </Text>
          </View>
          <View style={styles.analyticItem}>
            <Text style={[styles.analyticValue, isDarkMode && styles.textLight]}>
              {analytics.activeConversations}
            </Text>
            <Text style={[styles.analyticLabel, isDarkMode && styles.textLight]}>
              Active Chats
            </Text>
          </View>
        </View>
      </View>
    );
  }, [analytics, isDarkMode]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <AndroidStatusBar
        backgroundColor={isDarkMode ? colors.background.darkMode.primary : colors.background.primary}
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />

      {/* Header Actions */}
      <View style={styles.header}>
        <Button
          label="Create Agent"
          onPress={() => {/* Navigate to create screen */}}
          variant="primary"
        />
        {selectedAgents.length > 0 && (
          <View style={styles.batchActions}>
            <Button
              label="Activate"
              onPress={() => handleBatchOperation('activate')}
              variant="secondary"
            />
            <Button
              label="Deactivate"
              onPress={() => handleBatchOperation('deactivate')}
              variant="outline"
            />
            <Button
              label="Delete"
              onPress={() => handleBatchOperation('delete')}
              variant="outline"
            />
          </View>
        )}
      </View>

      {/* Analytics Summary */}
      {renderAnalytics}

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Agent List */}
      {loading ? (
        <LoadingSpinner size="large" />
      ) : (
        <FlatList
          data={agents}
          renderItem={renderAgentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAgents(false);
              }}
              colors={[colors.primary.default]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDarkMode && styles.textLight]}>
                No agents found. Create your first AI agent to get started.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  containerDark: {
    backgroundColor: colors.background.darkMode.primary
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default
  },
  batchActions: {
    flexDirection: 'row',
    gap: Spacing.sm
  },
  analyticsContainer: {
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    elevation: 2
  },
  analyticsContainerDark: {
    backgroundColor: colors.background.darkMode.secondary
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.sm
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  analyticItem: {
    alignItems: 'center'
  },
  analyticValue: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  analyticLabel: {
    fontSize: 12,
    color: colors.text.secondary
  },
  listContainer: {
    padding: Spacing.md
  },
  agentCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2
  },
  agentCardDark: {
    backgroundColor: colors.background.darkMode.elevated
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: colors.primary.default
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  agentName: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusactive: {
    backgroundColor: colors.success.surface
  },
  statusinactive: {
    backgroundColor: colors.error.surface
  },
  statuspending: {
    backgroundColor: colors.warning.surface
  },
  statusText: {
    fontSize: 12,
    textTransform: 'capitalize'
  },
  agentDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: Spacing.md
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metric: {
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  metricLabel: {
    fontSize: 12,
    color: colors.text.secondary
  },
  errorContainer: {
    backgroundColor: colors.error.surface,
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: 8
  },
  errorText: {
    color: colors.error.text,
    textAlign: 'center'
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center'
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary
  },
  textLight: {
    color: colors.text.darkMode.primary
  }
});

export default AgentManagementScreen;