/**
 * PostCSS Configuration
 * Sets up the CSS processing pipeline for the AI-Enhanced Social Travel Platform
 * Integrates Tailwind CSS, modern CSS features, and cross-browser compatibility
 * @version 1.0.0
 */

// Import path for TypeScript-based Tailwind config
const tailwindConfig = './tailwind.config.ts';

/**
 * @type {import('postcss').Config}
 */
module.exports = {
  plugins: [
    // Handle @import rules and combine CSS files
    require('postcss-import')(),

    // Process Tailwind CSS directives and utilities
    // @version 3.3.0
    require('tailwindcss')({
      config: tailwindConfig
    }),

    // Enable modern CSS features with Stage 3 support
    // @version 8.3.2
    require('postcss-preset-env')({
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
        'color-function': true,
        'gap-properties': true,
        'place-properties': true
      },
      // Ensure compatibility with Tailwind's processing
      autoprefixer: false
    }),

    // Process nested CSS with enhanced support
    // @version 6.0.1
    require('postcss-nested')({
      // Bubble up @media and @supports queries
      bubble: ['media', 'supports']
    }),

    // Add vendor prefixes with enhanced configuration
    // @version 10.4.14
    require('autoprefixer')({
      // Optimize flexbox support
      flexbox: 'no-2009',
      // Enable Grid autoplacement
      grid: 'autoplace',
      // Ensure support for target browsers
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'Firefox ESR',
        'not dead'
      ]
    })
  ]
};