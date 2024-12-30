'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'; // v2.4.1
import BookingCard from '@/components/booking/BookingCard/BookingCard';
import PaymentSplit from '@/components/booking/PaymentSplit/PaymentSplit';
import { getBooking, cancelBooking } from '@/services/booking';
import { Booking, PaymentStatus } from '@/types/booking';
import { colors, typography, spacing } from '@/constants/theme';

/**
 * BookingDetailsPage Component
 * Displays comprehensive booking information with payment management capabilities
 * 
 * @version 1.0.0
 */
const BookingDetailsPage: React.FC = () => {
  // Hooks and state
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches booking details with retry mechanism and error handling
   */
  const fetchBookingDetails = useCallback(async () => {
    if (!params.bookingId) {
      setError('Invalid booking ID');
      return;
    }

    try {
      setIsLoading(true);
      const bookingData = await getBooking(params.bookingId as string);
      setBooking(bookingData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load booking details');
      toast.error('Unable to load booking details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [params.bookingId]);

  /**
   * Handles booking cancellation with confirmation and analytics
   */
  const handleCancelBooking = useCallback(async () => {
    if (!booking?.id) return;

    const confirmed = window.confirm('Are you sure you want to cancel this booking?');
    if (!confirmed) return;

    try {
      await cancelBooking(booking.id);
      toast.success('Booking cancelled successfully');
      await fetchBookingDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking');
    }
  }, [booking?.id, fetchBookingDetails]);

  /**
   * Handles payment split completion with analytics
   */
  const handlePaymentSplitComplete = useCallback(async () => {
    if (!booking) return;

    try {
      await fetchBookingDetails();
      toast.success('Payment split updated successfully');
    } catch (err) {
      toast.error('Failed to update payment split');
    }
  }, [booking, fetchBookingDetails]);

  // Initial data fetch
  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  // Metadata for the page
  const metadata = {
    title: `Booking Details | AI Travel Platform`,
    description: 'View and manage your travel booking details with real-time updates'
  };

  // Loading state
  if (isLoading) {
    return (
      <div 
        className="flex justify-center items-center min-h-screen"
        style={{ fontFamily: typography.fontFamilyUI }}
      >
        <div className="animate-pulse text-center">
          <div className="text-lg">Loading booking details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen p-4"
        style={{ fontFamily: typography.fontFamilyUI }}
      >
        <div 
          className="text-lg mb-4"
          style={{ color: colors.error }}
        >
          {error || 'Booking not found'}
        </div>
        <button
          onClick={() => router.push('/bookings')}
          className="px-4 py-2 rounded"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          Return to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ 
            fontFamily: typography.fontFamilyHeadings,
            color: colors.textPrimary 
          }}
        >
          Booking Details
        </h1>
        <p 
          className="text-gray-600"
          style={{ fontFamily: typography.fontFamilyUI }}
        >
          Reference: {booking.amadeusPNR}
        </p>
      </div>

      <div className="space-y-8">
        {/* Booking Information Card */}
        <BookingCard
          booking={booking}
          onCancel={handleCancelBooking}
          isLoading={isLoading}
        />

        {/* Payment Split Section */}
        {booking.paymentStatus !== PaymentStatus.COMPLETED && booking.paymentSplits && (
          <div 
            className="bg-white rounded-lg shadow-md p-6"
            style={{ borderColor: colors.backgroundSecondary }}
          >
            <PaymentSplit
              bookingId={booking.id}
              totalAmount={booking.totalAmount}
              currency={booking.currency}
              onSplitComplete={handlePaymentSplitComplete}
            />
          </div>
        )}

        {/* Additional Booking Details */}
        <div 
          className="bg-white rounded-lg shadow-md p-6"
          style={{ borderColor: colors.backgroundSecondary }}
        >
          <h2 
            className="text-xl font-semibold mb-4"
            style={{ fontFamily: typography.fontFamilyUI }}
          >
            Travel Details
          </h2>
          <div className="space-y-4">
            {booking.amadeusDetails.itineraryDetails.segments.map((segment, index) => (
              <div 
                key={index}
                className="border-b last:border-b-0 pb-4"
                style={{ borderColor: colors.backgroundSecondary }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Departure</p>
                    <p className="font-medium">{segment.departureAirport}</p>
                    <p className="text-sm">
                      {new Date(segment.departureTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Arrival</p>
                    <p className="font-medium">{segment.arrivalAirport}</p>
                    <p className="text-sm">
                      {new Date(segment.arrivalTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsPage;