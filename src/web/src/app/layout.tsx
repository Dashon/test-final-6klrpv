'use client';

import { Roboto, Playfair_Display } from 'next/font/google';
import { StoreProvider } from '../lib/redux';
import '../styles/globals.css';
import '../styles/theme.css';

// Configure Roboto font for UI elements
const roboto = Roboto({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto',
  preload: true,
});

// Configure Playfair Display font for headings
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-playfair',
  preload: true,
});

// Metadata configuration for SEO and browser integration
export const metadata = {
  title: 'AI-Enhanced Social Travel Platform',
  description: 'Plan travel with AI personas, connect with travelers, and access professional services',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#1A73E8',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-16x16.png'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://travel-platform.com',
    title: 'AI-Enhanced Social Travel Platform',
    description: 'Plan travel with AI personas, connect with travelers, and access professional services',
    siteName: 'AI Travel Platform'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI-Enhanced Social Travel Platform',
    description: 'Plan travel with AI personas, connect with travelers, and access professional services'
  },
  alternates: {
    canonical: 'https://travel-platform.com'
  },
  robots: {
    index: true,
    follow: true
  }
};

/**
 * Root layout component providing global configuration and providers
 * Implements design system fonts and Redux store
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`antialiased scroll-smooth ${roboto.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans">
        <StoreProvider>
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {children}
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}

// Configure runtime
export const runtime = 'edge';

// Configure dynamic metadata generation
export async function generateMetadata() {
  return {
    ...metadata,
    // Add any dynamic metadata here
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
    manifest: '/manifest.json',
  };
}