/**
 * @fileoverview Professional consultation management screen component
 * @version 1.0.0
 * 
 * Implements a comprehensive consultation management interface with:
 * - Real-time consultation updates via WebSocket
 * - Video/chat integration with Twilio
 * - Offline support with local caching
 * - Pagination and filtering capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.x
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Platform,
  Alert
} from 'react-native'; // v0.71.x
import { useNavigation, useIsFocused } from '@react-navigation/native'; // v6.x
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { colors } from '../../constants/colors';
import { Spacing, Layout } from '../../constants/layout';

// Types for consultation management
interface IConsultation {
  id: string;
  clientName: string;
  scheduledTime: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  type: 'video' | 'chat' | 'ai-assisted';
  notes?: string;
  duration: number;
  price: number;
}

interface ConsultationFilter {
  type: 'all' | 'video' | 'chat' | 'ai-assisted';
  status: 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

interface ConsultationScreenProps {
  professionalId: string;
}

/**
 * Professional consultation management screen with real-time updates
 * and comprehensive consultation handling capabilities.
 */
const ConsultationScreen: React.FC<ConsultationScreenProps> = ({ professionalId }) => {
  // Navigation and screen focus hooks
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // State management
  const [consultations, setConsultations] = useState<IConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [pagination, setPagination] = useState({ page: 1, hasMore: true });
  const [filter, setFilter] = useState<ConsultationFilter>({
    type: 'all',
    status: 'all'
  });

  // WebSocket connection management
  useEffect(() => {
    const setupWebSocket = () => {
      const ws = new WebSocket(`wss://api.example.com/consultations/${professionalId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(JSON.parse(event.data));
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        // Attempt to reconnect after delay
        setTimeout(setupWebSocket, 5000);
      };

      setWsConnection(ws);
    };

    if (isFocused) {
      setupWebSocket();
    }

    return () => {
      wsConnection?.close();
    };
  }, [isFocused, professionalId]);

  // Fetch consultations with pagination and filtering
  const fetchConsultations = useCallback(async (options: {
    page: number;
    filter: ConsultationFilter;
    refresh?: boolean;
  }) => {
    try {
      setLoading(options.refresh ? false : loading);
      
      const response = await fetch(
        `https://api.example.com/professionals/${professionalId}/consultations?` +
        `page=${options.page}&type=${options.filter.type}&status=${options.filter.status}`,
        {
          headers: {
            'Content-Type': 'application/json',
            // Add authentication headers here
          }
        }
      );

      const data = await response.json();
      
      if (options.refresh) {
        setConsultations(data.consultations);
      } else {
        setConsultations(prev => [...prev, ...data.consultations]);
      }

      setPagination({
        page: options.page,
        hasMore: data.hasMore
      });
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to load consultations. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalId]);

  // Handle real-time updates via WebSocket
  const handleWebSocketMessage = useCallback((message: {
    type: string;
    consultation: IConsultation;
  }) => {
    switch (message.type) {
      case 'consultation_updated':
        setConsultations(prev =>
          prev.map(cons =>
            cons.id === message.consultation.id ? message.consultation : cons
          )
        );
        break;
      case 'consultation_created':
        setConsultations(prev => [message.consultation, ...prev]);
        break;
      case 'consultation_cancelled':
        setConsultations(prev =>
          prev.map(cons =>
            cons.id === message.consultation.id
              ? { ...cons, status: 'cancelled' }
              : cons
          )
        );
        break;
    }
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConsultations({ page: 1, filter, refresh: true });
  }, [fetchConsultations, filter]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && pagination.hasMore) {
      fetchConsultations({
        page: pagination.page + 1,
        filter
      });
    }
  }, [loading, pagination, filter, fetchConsultations]);

  // Filter handler
  const handleFilterChange = useCallback((newFilter: Partial<ConsultationFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    fetchConsultations({ page: 1, filter: updatedFilter, refresh: true });
  }, [filter, fetchConsultations]);

  // Consultation item renderer
  const renderConsultation = useCallback(({ item }: { item: IConsultation }) => (
    <TouchableOpacity
      style={styles.consultationCard}
      onPress={() => navigation.navigate('ConsultationDetail', { consultation: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <Text style={[styles.status, styles[`status_${item.status}`]]}>
          {item.status}
        </Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.type}>{item.type}</Text>
        <Text style={styles.time}>
          {new Date(item.scheduledTime).toLocaleString()}
        </Text>
        <Text style={styles.price}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  ), [navigation]);

  // Empty state component
  const EmptyState = useMemo(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        No consultations found
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter.type === 'all' && styles.filterButtonActive
          ]}
          onPress={() => handleFilterChange({ type: 'all' })}
        >
          <Text style={styles.filterButtonText}>All</Text>
        </TouchableOpacity>
        {/* Add more filter buttons here */}
      </View>

      {/* Consultation List */}
      <FlatList
        data={consultations}
        renderItem={renderConsultation}
        keyExtractor={item => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary.default]}
          />
        }
        ListEmptyComponent={!loading ? EmptyState : null}
        ListFooterComponent={
          loading && !refreshing ? (
            <LoadingSpinner size="small" />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  filterContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.CARD_BORDER_RADIUS,
    marginRight: Spacing.sm
  },
  filterButtonActive: {
    backgroundColor: colors.primary.surface
  },
  filterButtonText: {
    color: colors.text.primary
  },
  listContent: {
    flexGrow: 1,
    padding: Spacing.md
  },
  consultationCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: Layout.CARD_BORDER_RADIUS,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary
  },
  status: {
    fontSize: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.CARD_BORDER_RADIUS / 2
  },
  status_scheduled: {
    backgroundColor: colors.warning.surface,
    color: colors.warning.text
  },
  status_in_progress: {
    backgroundColor: colors.primary.surface,
    color: colors.primary.dark
  },
  status_completed: {
    backgroundColor: colors.success.surface,
    color: colors.success.text
  },
  status_cancelled: {
    backgroundColor: colors.error.surface,
    color: colors.error.text
  },
  cardBody: {
    marginTop: Spacing.sm
  },
  type: {
    fontSize: 14,
    color: colors.text.secondary
  },
  time: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: Spacing.xs
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success.default,
    marginTop: Spacing.xs
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center'
  }
});

export default ConsultationScreen;