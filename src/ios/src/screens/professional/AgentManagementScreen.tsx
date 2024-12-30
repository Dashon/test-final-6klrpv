/**
 * Professional Dashboard Screen for AI Agent Management
 * @version 1.0.0
 * 
 * Implements comprehensive AI agent management functionality with analytics tracking,
 * accessibility support, and error handling.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  AccessibilityInfo,
  Platform,
  Alert
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client'; // ^3.7.0
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { Analytics } from '../../utils/analytics';
import { colors } from '../../constants/colors';
import { fontFamilies, fontSizes } from '../../constants/typography';
import { getResponsiveSpacing } from '../../utils/responsive';

// Maximum number of agents a professional can create
const MAX_AGENTS = 5;

// Analytics event types
const ANALYTICS_EVENTS = {
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  AGENT_DELETED: 'agent_deleted',
  AGENT_STATUS_CHANGED: 'agent_status_changed'
} as const;

// GraphQL queries and mutations
const GET_AGENTS = `
  query GetAgents($professionalId: ID!) {
    agents(professionalId: $professionalId) {
      id
      name
      description
      status
      metrics {
        totalInteractions
        averageRating
        revenue
      }
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_AGENT_STATUS = `
  mutation UpdateAgentStatus($agentId: ID!, $status: AgentStatus!) {
    updateAgentStatus(agentId: $agentId, status: $status) {
      id
      status
    }
  }
`;

// Types
interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED';
  metrics: {
    totalInteractions: number;
    averageRating: number;
    revenue: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface AgentCardProps {
  agent: Agent;
  onEdit: (agentId: string) => void;
  onToggleStatus: (agentId: string, newStatus: 'DRAFT' | 'PUBLISHED') => void;
}

/**
 * Agent Card Component
 * Displays individual agent information with actions
 */
const AgentCard: React.FC<AgentCardProps> = React.memo(({ 
  agent, 
  onEdit, 
  onToggleStatus 
}) => {
  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(agent.metrics.revenue);

  return (
    <Card
      elevation={2}
      style={styles.agentCard}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${agent.name} agent card. Status: ${agent.status.toLowerCase()}`}
    >
      <View style={styles.agentHeader}>
        <Text style={styles.agentName}>{agent.name}</Text>
        <Text 
          style={[
            styles.agentStatus,
            agent.status === 'PUBLISHED' ? styles.statusPublished : styles.statusDraft
          ]}
        >
          {agent.status}
        </Text>
      </View>

      <Text style={styles.agentDescription} numberOfLines={2}>
        {agent.description}
      </Text>

      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Interactions</Text>
          <Text style={styles.metricValue}>{agent.metrics.totalInteractions}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Rating</Text>
          <Text style={styles.metricValue}>
            {agent.metrics.averageRating.toFixed(1)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Revenue</Text>
          <Text style={styles.metricValue}>{formattedRevenue}</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Button
          variant="outline"
          size="small"
          onPress={() => onEdit(agent.id)}
          accessibilityLabel={`Edit ${agent.name}`}
          style={styles.actionButton}
        >
          Edit
        </Button>
        <Button
          variant="primary"
          size="small"
          onPress={() => onToggleStatus(
            agent.id,
            agent.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
          )}
          accessibilityLabel={`${agent.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'} ${agent.name}`}
          style={styles.actionButton}
        >
          {agent.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
        </Button>
      </View>
    </Card>
  );
});

/**
 * Main Agent Management Screen Component
 */
const AgentManagementScreen: React.FC = () => {
  const { professionalId } = useAuth();
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Query for fetching agents
  const { 
    data, 
    loading, 
    error, 
    refetch 
  } = useQuery(GET_AGENTS, {
    variables: { professionalId },
    fetchPolicy: 'cache-and-network'
  });

  // Mutation for updating agent status
  const [updateAgentStatus] = useMutation(UPDATE_AGENT_STATUS);

  // Check screen reader status
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Handles navigation to agent creation screen
   */
  const handleCreateAgent = useCallback(async () => {
    try {
      if (data?.agents?.length >= MAX_AGENTS) {
        Alert.alert(
          'Agent Limit Reached',
          `You can create a maximum of ${MAX_AGENTS} agents.`,
          [{ text: 'OK' }]
        );
        return;
      }

      await Analytics.trackEvent(ANALYTICS_EVENTS.AGENT_CREATED, {
        professional_id: professionalId
      });

      // Navigate to creation screen
      // navigation.navigate('CreateAgent');
    } catch (error) {
      console.error('Failed to initiate agent creation:', error);
    }
  }, [data?.agents?.length, professionalId]);

  /**
   * Handles navigation to agent edit screen
   */
  const handleEditAgent = useCallback(async (agentId: string) => {
    try {
      await Analytics.trackEvent(ANALYTICS_EVENTS.AGENT_UPDATED, {
        agent_id: agentId,
        professional_id: professionalId
      });

      // Navigate to edit screen
      // navigation.navigate('EditAgent', { agentId });
    } catch (error) {
      console.error('Failed to initiate agent edit:', error);
    }
  }, [professionalId]);

  /**
   * Handles agent status toggle with optimistic updates
   */
  const handleToggleStatus = useCallback(async (
    agentId: string,
    newStatus: 'DRAFT' | 'PUBLISHED'
  ) => {
    try {
      await updateAgentStatus({
        variables: { agentId, status: newStatus },
        optimisticResponse: {
          updateAgentStatus: {
            id: agentId,
            status: newStatus,
            __typename: 'Agent'
          }
        }
      });

      await Analytics.trackEvent(ANALYTICS_EVENTS.AGENT_STATUS_CHANGED, {
        agent_id: agentId,
        new_status: newStatus,
        professional_id: professionalId
      });
    } catch (error) {
      console.error('Failed to update agent status:', error);
      Alert.alert(
        'Update Failed',
        'Failed to update agent status. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [updateAgentStatus, professionalId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Failed to load agents. Please try again.
        </Text>
        <Button
          variant="primary"
          onPress={() => refetch()}
          accessibilityLabel="Retry loading agents"
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Agents</Text>
          <Button
            variant="primary"
            onPress={handleCreateAgent}
            accessibilityLabel="Create new AI agent"
          >
            Create Agent
          </Button>
        </View>

        <FlatList
          data={data?.agents || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AgentCard
              agent={item}
              onEdit={handleEditAgent}
              onToggleStatus={handleToggleStatus}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No agents created yet. Create your first AI agent to get started.
              </Text>
            </View>
          }
          accessible={true}
          accessibilityLabel="AI agents list"
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: getResponsiveSpacing(4)
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSpacing(4)
  },
  title: {
    fontSize: fontSizes.xl,
    fontFamily: fontFamilies.heading.bold,
    color: colors.text.primary
  },
  listContent: {
    paddingBottom: getResponsiveSpacing(4)
  },
  agentCard: {
    marginBottom: getResponsiveSpacing(3)
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSpacing(2)
  },
  agentName: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.primary.bold,
    color: colors.text.primary
  },
  agentStatus: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.primary.regular,
    paddingHorizontal: getResponsiveSpacing(2),
    paddingVertical: getResponsiveSpacing(1),
    borderRadius: 4
  },
  statusPublished: {
    backgroundColor: colors.success.background,
    color: colors.success.default
  },
  statusDraft: {
    backgroundColor: colors.warning.background,
    color: colors.warning.default
  },
  agentDescription: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.primary.regular,
    color: colors.text.secondary,
    marginBottom: getResponsiveSpacing(3)
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSpacing(3)
  },
  metricItem: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.primary.regular,
    color: colors.text.secondary,
    marginBottom: getResponsiveSpacing(1)
  },
  metricValue: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.primary.bold,
    color: colors.text.primary
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  actionButton: {
    marginLeft: getResponsiveSpacing(2)
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(6)
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.primary.regular,
    color: colors.text.secondary,
    textAlign: 'center'
  },
  errorText: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.primary.regular,
    color: colors.error.default,
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(3)
  }
});

export default AgentManagementScreen;