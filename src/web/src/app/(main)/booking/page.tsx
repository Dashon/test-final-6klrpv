'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import styled from '@emotion/styled';
import BookingCard from '../../../components/booking/BookingCard/BookingCard';
import PaymentSplit from '../../../components/booking/PaymentSplit/PaymentSplit';
import { useBooking } from '../../../hooks/useBooking';
import { colors, typography, spacing, breakpoints } from '../../../constants/theme';
import { BookingStatus, PaymentStatus } from '../../../types/booking';

// Styled components with responsive design
const BookingContainer = styled.main`
  padding: clamp(16px, 5vw, 24px);
  max-width: var(--max-content-width, 1200px);
  margin: 0 auto;
  min-height: 100vh;
  font-family: ${typography.fontFamilyUI};
`;

const BookingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.lg}px;
  flex-wrap: wrap;
  gap: ${spacing.md}px;

  @media (max-width: ${breakpoints.mobile}px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const BookingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
  gap: clamp(16px, 3vw, 24px);
  width: 100%;
`;

const FilterSection = styled.div`
  display: flex;
  gap: ${spacing.md}px;
  align-items: center;
  flex-wrap: wrap;
`;

const StatusFilter = styled.select`
  padding: 8px 12px;
  border: 1px solid ${colors.textSecondary};
  border-radius: 4px;
  font-family: ${typography.fontFamilyUI};
  background-color: ${colors.backgroundPrimary};
`;

const NoBookings = styled.div`
  text-align: center;
  padding: ${spacing.xl}px;
  color: ${colors.textSecondary};
`;

// Custom hook for inventory polling
const useInventoryPoller = (pollInterval: number, bookingIds: string[]) => {
  const { inventoryStatus } = useBooking();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!bookingIds.length) return;

    const poll = async () => {
      try {
        // Implementation would connect to WebSocket or poll API
        // for real-time inventory status updates
      } catch (err) {
        setError(err as Error);
      }
    };

    const intervalId = setInterval(poll, pollInterval);
    return () => clearInterval(intervalId);
  }, [bookingIds, pollInterval]);

  return { inventoryStatus, error };
};

// Custom hook for managing booking filters
const useBookingFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    sortBy: searchParams.get('sortBy') || 'date'
  });

  const updateFilters = useCallback(
    debounce((newFilters: typeof filters) => {
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      router.push(`/booking?${params.toString()}`);
    }, 300),
    [router]
  );

  return { filters, updateFilters };
};

const BookingPage: React.FC = () => {
  const {
    bookings,
    loading,
    error,
    fetchBookings,
    updateBooking,
    processSplitPayment,
    cancelBooking
  } = useBooking();

  const { filters, updateFilters } = useBookingFilters();
  const router = useRouter();

  // Poll inventory for active bookings
  const activeBookingIds = useMemo(
    () => bookings.filter(b => b.status === BookingStatus.PENDING).map(b => b.id),
    [bookings]
  );
  useInventoryPoller(30000, activeBookingIds);

  // Initial data fetch
  useEffect(() => {
    fetchBookings().catch(console.error);
  }, [fetchBookings]);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter(booking => 
        filters.status === 'all' || booking.status === filters.status
      )
      .sort((a, b) => 
        filters.sortBy === 'date' 
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : b.totalAmount - a.totalAmount
      );
  }, [bookings, filters]);

  // Event handlers
  const handleViewDetails = useCallback((bookingId: string) => {
    router.push(`/booking/${bookingId}`);
  }, [router]);

  const handleCancel = useCallback(async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
    } catch (err) {
      console.error('Failed to cancel booking:', err);
    }
  }, [cancelBooking]);

  const handleSplitComplete = useCallback(async (bookingId: string, splits: any[], status: PaymentStatus) => {
    try {
      await processSplitPayment(bookingId, splits);
    } catch (err) {
      console.error('Failed to process split payment:', err);
    }
  }, [processSplitPayment]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ ...filters, [e.target.name]: e.target.value });
  }, [filters, updateFilters]);

  return (
    <BookingContainer role="main" aria-label="Booking management">
      <BookingHeader>
        <h1 className="text-2xl font-bold">Your Bookings</h1>
        <FilterSection>
          <StatusFilter
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            aria-label="Filter by booking status"
          >
            <option value="all">All Bookings</option>
            <option value={BookingStatus.PENDING}>Pending</option>
            <option value={BookingStatus.CONFIRMED}>Confirmed</option>
            <option value={BookingStatus.CANCELLED}>Cancelled</option>
          </StatusFilter>
          <StatusFilter
            name="sortBy"
            value={filters.sortBy}
            onChange={handleFilterChange}
            aria-label="Sort bookings by"
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
          </StatusFilter>
        </FilterSection>
      </BookingHeader>

      {loading.fetch && (
        <div role="status" aria-busy="true" className="text-center py-8">
          Loading bookings...
        </div>
      )}

      {error.fetch && (
        <div role="alert" className="text-error text-center py-8">
          {error.fetch.message}
        </div>
      )}

      {!loading.fetch && !error.fetch && filteredBookings.length === 0 && (
        <NoBookings>
          <p>No bookings found</p>
        </NoBookings>
      )}

      <BookingGrid role="region" aria-label="Booking list">
        {filteredBookings.map(booking => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onViewDetails={handleViewDetails}
            onCancel={booking.status === BookingStatus.PENDING ? handleCancel : undefined}
            onPaymentSplit={
              booking.paymentSplits?.length > 0
                ? splits => handleSplitComplete(booking.id, splits, PaymentStatus.COMPLETED)
                : undefined
            }
            testId={`booking-card-${booking.id}`}
          />
        ))}
      </BookingGrid>
    </BookingContainer>
  );
};

export default BookingPage;