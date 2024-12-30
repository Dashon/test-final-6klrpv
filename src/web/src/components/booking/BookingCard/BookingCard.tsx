/**
 * BookingCard Component
 * A reusable card component for displaying booking information with split payment support
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import Card from '../../shared/Card/Card';
import Button from '../../shared/Button/Button';
import { Booking, BookingStatus, PaymentStatus, PaymentSplit } from '../../../types/booking';
import { formatCurrency, formatDate } from '../../../utils/formatting';
import { useSelector } from 'react-redux';
import { selectBookingLoading, selectBookingError } from '../../../store/slices/bookingSlice';
import { colors, typography, spacing, breakpoints } from '../../../constants/theme';

// Styled components with accessibility and responsive design
const StyledBookingCard = styled(Card)`
  margin-bottom: ${spacing.md}px;
  transition: transform 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const BookingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.md}px;

  @media (max-width: ${breakpoints.mobile}px) {
    flex-direction: column;
    align-items: flex-start;
    gap: ${spacing.sm}px;
  }
`;

const BookingTitle = styled.h3`
  font-family: ${typography.fontFamilyUI};
  font-size: ${typography.fontSizeH3};
  margin: 0;
  color: ${colors.textPrimary};
`;

const StatusBadge = styled.span<{ status: BookingStatus }>`
  padding: ${spacing.xxs}px ${spacing.xs}px;
  border-radius: 4px;
  font-size: ${typography.fontSizeSmall};
  font-weight: ${typography.fontWeightMedium};
  background-color: ${props => getStatusColor(props.status)};
  color: white;
`;

const BookingDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${spacing.md}px;
  margin-bottom: ${spacing.md}px;

  @media (max-width: ${breakpoints.mobile}px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  h4 {
    font-size: ${typography.fontSizeSmall};
    color: ${colors.textSecondary};
    margin: 0 0 ${spacing.xxs}px 0;
  }

  p {
    margin: 0;
    color: ${colors.textPrimary};
    font-weight: ${typography.fontWeightMedium};
  }
`;

const PaymentInfo = styled.div`
  background-color: ${colors.backgroundSecondary};
  padding: ${spacing.sm}px;
  border-radius: 4px;
  margin-bottom: ${spacing.md}px;
`;

const BookingActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${spacing.sm}px;

  @media (max-width: ${breakpoints.mobile}px) {
    flex-direction: column;
  }
`;

// Props interface
interface BookingCardProps {
  booking: Booking;
  onViewDetails: (bookingId: string) => void;
  onCancel?: (bookingId: string) => void;
  onPaymentSplit?: (bookingId: string, splitDetails: PaymentSplit) => void;
  className?: string;
  testId?: string;
}

// Helper functions
const getStatusColor = (status: BookingStatus): string => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return colors.success;
    case BookingStatus.PENDING:
      return colors.warning;
    case BookingStatus.CANCELLED:
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const getPaymentStatusText = (status: PaymentStatus, splits?: PaymentSplit[]): string => {
  if (splits && splits.length > 0) {
    const completedPayments = splits.filter(s => s.status === PaymentStatus.COMPLETED).length;
    return `${completedPayments}/${splits.length} payments completed`;
  }
  return status === PaymentStatus.COMPLETED ? 'Paid' : 'Payment pending';
};

/**
 * BookingCard component displaying booking information with payment status
 */
export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onViewDetails,
  onCancel,
  onPaymentSplit,
  className,
  testId
}) => {
  const loading = useSelector(selectBookingLoading);
  const error = useSelector(selectBookingError);

  const handleClick = useCallback(() => {
    onViewDetails(booking.id);
  }, [booking.id, onViewDetails]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(booking.id);
    }
  }, [booking.id, onCancel]);

  const paymentStatus = useMemo(() => 
    getPaymentStatusText(booking.paymentStatus, booking.paymentSplits),
    [booking.paymentStatus, booking.paymentSplits]
  );

  return (
    <StyledBookingCard
      elevation={2}
      onClick={handleClick}
      className={className}
      data-testid={testId}
      role="article"
      aria-label={`Booking ${booking.amadeusPNR}`}
    >
      <BookingHeader>
        <BookingTitle>Booking {booking.amadeusPNR}</BookingTitle>
        <StatusBadge status={booking.status}>
          {booking.status}
        </StatusBadge>
      </BookingHeader>

      <BookingDetails>
        <DetailItem>
          <h4>Travel Dates</h4>
          <p>
            {formatDate(booking.amadeusDetails.itineraryDetails.segments[0].departureTime)} -
            {formatDate(booking.amadeusDetails.itineraryDetails.segments[0].arrivalTime)}
          </p>
        </DetailItem>
        <DetailItem>
          <h4>Total Amount</h4>
          <p>{formatCurrency(booking.totalAmount, booking.currency)}</p>
        </DetailItem>
        <DetailItem>
          <h4>Travelers</h4>
          <p>{booking.travellerDetails.length} person(s)</p>
        </DetailItem>
      </BookingDetails>

      {booking.paymentSplits && booking.paymentSplits.length > 0 && (
        <PaymentInfo>
          <h4>Payment Status</h4>
          <p>{paymentStatus}</p>
        </PaymentInfo>
      )}

      <BookingActions>
        {booking.status === BookingStatus.PENDING && onCancel && (
          <Button
            variant="text"
            onClick={handleCancel}
            disabled={loading}
            aria-label="Cancel booking"
          >
            Cancel
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleClick}
          disabled={loading}
          aria-label="View booking details"
        >
          View Details
        </Button>
      </BookingActions>
    </StyledBookingCard>
  );
};

export default BookingCard;