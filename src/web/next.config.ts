/**
 * Next.js Configuration
 * Version: 1.0.0
 * 
 * Production-ready configuration for the AI-Enhanced Social Travel Platform
 * Implements comprehensive optimizations, security headers, and environment-specific settings
 */

import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';

// Import environment-specific configurations
import { config as devConfig } from './src/config/development';
import { config as prodConfig } from './src/config/production';
import { config as stagingConfig } from './src/config/staging';

/**
 * Get environment-specific configuration based on current environment
 * @param env Current environment string
 * @returns Environment-specific configuration object
 */
const getEnvironmentConfig = (env: string) => {
  switch (env) {
    case 'production':
      return prodConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return devConfig;
  }
};

// Get current environment configuration
const currentEnv = process.env.NEXT_PUBLIC_ENV || 'development';
const envConfig = getEnvironmentConfig(currentEnv);

// Configure bundle analyzer
const withBundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Base Next.js configuration
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || envConfig.api.baseUrl,
    NEXT_PUBLIC_ENV: currentEnv,
  },

  // Image optimization configuration
  images: {
    domains: [
      'cdn.aitravelplatform.com',
      'staging-cdn.aitravelplatform.com',
      'localhost'
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
    loader: 'custom',
    quality: 85,
    dangerouslyAllowSVG: false,
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; " +
                   "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
                   "style-src 'self' 'unsafe-inline'; " +
                   "img-src 'self' data: https:; " +
                   "font-src 'self' data:; " +
                   "connect-src 'self' https:; " +
                   "media-src 'self'; " +
                   "object-src 'none'; " +
                   "frame-ancestors 'self'; " +
                   "base-uri 'self'; " +
                   "form-action 'self'"
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
          }
        ]
      }
    ];
  },

  // Webpack configuration for optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          automaticNameDelimiter: '~',
          enforceSizeThreshold: 50000,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true
            }
          }
        }
      };
    }

    return config;
  }
};

// Progressive Web App configuration
const pwaConfig = {
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  scope: '/',
  sw: 'service-worker.js',
  runtimeCaching: [
    {
      urlPattern: '/*',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'page-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 86400
        }
      }
    }
  ]
};

// Export final configuration with all enhancements
export default withBundleAnalyzer(
  withPWA({
    ...nextConfig,
    pwa: pwaConfig
  })
);