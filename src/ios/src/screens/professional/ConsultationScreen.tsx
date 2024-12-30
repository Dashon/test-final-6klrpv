/**
 * @fileoverview Professional consultation management screen component
 * Implements video/chat consultations and AI agent interactions with accessibility
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  AccessibilityInfo,
  RefreshControl,
  Alert,
  Text,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Button from '../../components/shared/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/layout';
import { textStyles } from '../../constants/typography';
import { getResponsiveSpacing } from '../../utils/responsive';

// Types for consultation management
interface Consultation {
  id: string;
  clientName: string;
  scheduledTime: Date;
  type: 'video' | 'chat';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  aiAgentId?: string;
}

interface ConsultationScreenProps {
  navigation: any;
}

/**
 * Professional consultation management screen component
 * Handles video/chat consultations with comprehensive error handling
 */
const ConsultationScreen: React.FC<ConsultationScreenProps> = ({ navigation }) => {
  // State management
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const dispatch = useDispatch();
  const { professional } = useSelector((state: any) => state.auth);

  // Memoized consultation grouping
  const groupedConsultations = useMemo(() => {
    return consultations.reduce((groups, consultation) => {
      const status = consultation.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(consultation);
      return groups;
    }, {} as Record<string, Consultation[]>);
  }, [consultations]);

  /**
   * Fetches consultations with pagination and error handling
   */
  const fetchConsultations = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true);
      // API call would go here
      const response = await fetch(`/api/consultations?page=${pageNum}&limit=10`);
      const data = await response.json();
      
      if (pageNum === 1) {
        setConsultations(data.consultations);
      } else {
        setConsultations(prev => [...prev, ...data.consultations]);
      }
      
      setHasMore(data.hasMore);
      setPage(pageNum);
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
  }, []);

  /**
   * Handles joining a consultation with proper setup and error handling
   */
  const handleJoinConsultation = useCallback(async (
    consultationId: string,
    type: 'video' | 'chat'
  ) => {
    try {
      // Initialize appropriate SDK based on consultation type
      if (type === 'video') {
        // Video consultation setup
        await dispatch({ 
          type: 'INIT_VIDEO_SESSION',
          payload: { consultationId }
        });
        
        navigation.navigate('VideoConsultation', { consultationId });
      } else {
        // Chat consultation setup
        await dispatch({
          type: 'INIT_CHAT_SESSION',
          payload: { consultationId }
        });
        
        navigation.navigate('ChatConsultation', { consultationId });
      }
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Failed to join consultation. Please check your internet connection.',
        [{ text: 'Retry', onPress: () => handleJoinConsultation(consultationId, type) }]
      );
    }
  }, [dispatch, navigation]);

  // Initial load and refresh handling
  useEffect(() => {
    fetchConsultations();
    
    // Set up accessibility announcements
    AccessibilityInfo.announceForAccessibility('Consultation screen loaded');
    
    return () => {
      // Cleanup any active sessions
      dispatch({ type: 'CLEANUP_CONSULTATION_SESSIONS' });
    };
  }, []);

  const renderConsultationItem = useCallback((consultation: Consultation) => (
    <View 
      key={consultation.id}
      style={styles.consultationCard}
      accessible={true}
      accessibilityLabel={`Consultation with ${consultation.clientName} at ${consultation.scheduledTime}`}
      accessibilityRole="button"
    >
      <View style={styles.consultationHeader}>
        <Text style={[textStyles.h3, styles.clientName]}>
          {consultation.clientName}
        </Text>
        <Text style={[textStyles.caption, styles.consultationType]}>
          {consultation.type.toUpperCase()}
        </Text>
      </View>
      
      <Text style={[textStyles.body, styles.scheduledTime]}>
        {new Date(consultation.scheduledTime).toLocaleString()}
      </Text>
      
      <Button
        variant="primary"
        size="medium"
        onPress={() => handleJoinConsultation(consultation.id, consultation.type)}
        disabled={consultation.status === 'completed' || consultation.status === 'cancelled'}
        accessibilityLabel={`Join consultation with ${consultation.clientName}`}
      >
        Join Session
      </Button>
    </View>
  ), [handleJoinConsultation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchConsultations(1);
            }}
            tintColor={colors.primary.default}
          />
        }
      >
        {loading && page === 1 ? (
          <LoadingSpinner
            size="large"
            color={colors.primary.default}
            style={styles.loader}
          />
        ) : (
          Object.entries(groupedConsultations).map(([status, items]) => (
            <View key={status} style={styles.section}>
              <Text style={[textStyles.h2, styles.sectionHeader]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              {items.map(renderConsultationItem)}
            </View>
          ))
        )}
        
        {hasMore && !loading && (
          <Button
            variant="outline"
            size="medium"
            onPress={() => fetchConsultations(page + 1)}
            style={styles.loadMoreButton}
            accessibilityLabel="Load more consultations"
          >
            Load More
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  loader: {
    marginTop: getResponsiveSpacing(4),
  },
  section: {
    marginBottom: spacing.large,
    paddingHorizontal: spacing.medium,
  },
  sectionHeader: {
    marginBottom: spacing.medium,
    color: colors.text.primary,
  },
  consultationCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.medium,
    marginBottom: spacing.medium,
    ...Platform.select({
      ios: {
        shadowColor: colors.overlay.light,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  clientName: {
    flex: 1,
    color: colors.text.primary,
  },
  consultationType: {
    color: colors.text.secondary,
    marginLeft: spacing.small,
  },
  scheduledTime: {
    color: colors.text.secondary,
    marginBottom: spacing.medium,
  },
  loadMoreButton: {
    marginHorizontal: spacing.medium,
    marginBottom: spacing.large,
  },
});

export default ConsultationScreen;