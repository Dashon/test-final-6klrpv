/**
 * ConsultationCard Component
 * A reusable card component for displaying professional consultation details
 * with integrated video service capabilities and real-time status updates
 * @version 1.0.0
 */

import React from 'react'; // v18.x
import styled from '@emotion/styled'; // v11.x
import { format } from 'date-fns'; // v2.x
import { useMediaQuery, Theme } from '@mui/material'; // v5.x
import { Card } from '../../shared/Card/Card';
import { Button } from '../../shared/Button/Button';
import { colors, breakpoints } from '../../../constants/theme';

// Types and Interfaces
export interface VideoConfig {
  serviceId: string;
  roomId: string;
  token: string;
}

export interface IConsultation {
  id: string;
  title: string;
  scheduledTime: Date;
  duration: number;
  status: ConsultationStatus;
  videoStatus: VideoServiceStatus;
  professional: {
    id: string;
    name: string;
    isAiAgent: boolean;
  };
  client: {
    id: string;
    name: string;
  };
  price: number;
  timezone: string;
}

export enum ConsultationStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum VideoServiceStatus {
  READY = 'ready',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

export interface ConsultationCardProps {
  consultation: IConsultation;
  onJoin: (id: string, videoConfig: VideoConfig) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onReschedule: (id: string) => Promise<void>;
  className?: string;
}

// Styled Components
const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: ${breakpoints.mobile}px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: ${colors.textPrimary};
`;

const ConsultationInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  grid-gap: 12px;
  margin-bottom: 20px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.span`
  font-size: 0.875rem;
  color: ${colors.textSecondary};
`;

const Value = styled.span`
  font-size: 1rem;
  color: ${colors.textPrimary};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;

  @media (max-width: ${breakpoints.mobile}px) {
    justify-content: stretch;
    > button {
      flex: 1;
    }
  }
`;

const VideoStatus = styled.div<{ status: VideoServiceStatus }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => getStatusColor(props.status)};
  font-size: 0.875rem;

  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: currentColor;
  }
`;

// Helper Functions
const getStatusColor = (status: VideoServiceStatus): string => {
  switch (status) {
    case VideoServiceStatus.READY:
      return colors.success;
    case VideoServiceStatus.CONNECTING:
      return colors.warning;
    case VideoServiceStatus.ERROR:
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const formatConsultationTime = (date: Date, timezone: string): string => {
  return `${format(date, 'PPp')} (${timezone})`;
};

/**
 * ConsultationCard Component
 * Displays consultation details and provides actions for managing consultations
 */
export const ConsultationCard: React.FC<ConsultationCardProps> = ({
  consultation,
  onJoin,
  onCancel,
  onReschedule,
  className,
}) => {
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.mobile}px)`);
  const isActive = consultation.status === ConsultationStatus.SCHEDULED || 
                  consultation.status === ConsultationStatus.IN_PROGRESS;

  const handleJoin = async () => {
    try {
      // Assuming videoConfig would be part of consultation in a real implementation
      const videoConfig: VideoConfig = {
        serviceId: 'service-id',
        roomId: `room-${consultation.id}`,
        token: 'video-token',
      };
      await onJoin(consultation.id, videoConfig);
    } catch (error) {
      console.error('Failed to join consultation:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await onCancel(consultation.id);
    } catch (error) {
      console.error('Failed to cancel consultation:', error);
    }
  };

  const handleReschedule = async () => {
    try {
      await onReschedule(consultation.id);
    } catch (error) {
      console.error('Failed to reschedule consultation:', error);
    }
  };

  return (
    <Card 
      elevation={2}
      padding={24}
      className={className}
      role="article"
      aria-label={`Consultation: ${consultation.title}`}
    >
      <CardHeader>
        <Title>{consultation.title}</Title>
        <VideoStatus status={consultation.videoStatus}>
          {consultation.videoStatus.toLowerCase()}
        </VideoStatus>
      </CardHeader>

      <ConsultationInfo>
        <InfoItem>
          <Label>Professional</Label>
          <Value>
            {consultation.professional.name}
            {consultation.professional.isAiAgent && ' (AI Agent)'}
          </Value>
        </InfoItem>
        <InfoItem>
          <Label>Client</Label>
          <Value>{consultation.client.name}</Value>
        </InfoItem>
        <InfoItem>
          <Label>Scheduled Time</Label>
          <Value>{formatConsultationTime(consultation.scheduledTime, consultation.timezone)}</Value>
        </InfoItem>
        <InfoItem>
          <Label>Duration</Label>
          <Value>{consultation.duration} minutes</Value>
        </InfoItem>
        <InfoItem>
          <Label>Price</Label>
          <Value>${consultation.price.toFixed(2)}</Value>
        </InfoItem>
        <InfoItem>
          <Label>Status</Label>
          <Value>{consultation.status}</Value>
        </InfoItem>
      </ConsultationInfo>

      <ActionButtons>
        {isActive && (
          <>
            <Button
              variant="primary"
              size={isMobile ? 'large' : 'medium'}
              onClick={handleJoin}
              disabled={consultation.videoStatus === VideoServiceStatus.ERROR}
              aria-label="Join consultation"
            >
              Join
            </Button>
            <Button
              variant="secondary"
              size={isMobile ? 'large' : 'medium'}
              onClick={handleReschedule}
              aria-label="Reschedule consultation"
            >
              Reschedule
            </Button>
            <Button
              variant="text"
              size={isMobile ? 'large' : 'medium'}
              onClick={handleCancel}
              aria-label="Cancel consultation"
            >
              Cancel
            </Button>
          </>
        )}
      </ActionButtons>
    </Card>
  );
};

export default ConsultationCard;