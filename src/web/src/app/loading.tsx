'use client';

import React from 'react';
import { colors } from '../constants/theme';

/**
 * Loading component for Next.js 13 route segments
 * Implements accessible loading states with platform design system
 * Supports reduced motion preferences and provides fallback states
 * 
 * @returns {JSX.Element} Accessible loading spinner component
 */
export default function Loading(): JSX.Element {
  // Check if user prefers reduced motion
  const prefersReducedMotion = 
    typeof window !== 'undefined' 
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      role="progressbar"
      aria-label="Loading content"
      aria-busy="true"
      aria-live="polite"
      className="loading-container"
    >
      <div className="loading-spinner">
        <div className="loading-spinner-inner" />
      </div>
      <style jsx>{`
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          min-height: 200px;
          background-color: ${colors.backgroundPrimary};
        }

        .loading-spinner {
          position: relative;
          width: clamp(2rem, 5vw, 3rem);
          height: clamp(2rem, 5vw, 3rem);
        }

        .loading-spinner-inner {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top-color: ${colors.primary};
          border-radius: 50%;
          will-change: transform;
          animation: ${prefersReducedMotion ? 'none' : 'spin 1s linear infinite'};
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .loading-spinner {
            width: clamp(1.5rem, 4vw, 2rem);
            height: clamp(1.5rem, 4vw, 2rem);
          }
        }

        /* High contrast mode support */
        @media (forced-colors: active) {
          .loading-spinner-inner {
            border-top-color: CanvasText;
          }
        }
      `}</style>
    </div>
  );
}