// @ts-check
const path = require('path');
const { getBlacklistRE } = require('metro-config/src/defaults/blacklist');

/**
 * Metro configuration for React Native Android
 * https://facebook.github.io/metro/docs/configuration
 * 
 * @type {import('metro-config').MetroConfig}
 */
module.exports = {
  /**
   * Transformer configuration for processing source files
   */
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        // Enable inline requires for optimized bundle size
        inlineRequires: true,
        // Enable Babel runtime for polyfills
        enableBabelRuntime: true,
      },
    }),
    // Use React Native Babel transformer
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
    // Configure asset plugins for enhanced resource handling
    assetPlugins: [
      'react-native-asset-plugin',
      'custom-font-plugin'
    ],
  },

  /**
   * Resolver configuration for module resolution
   */
  resolver: {
    // Supported source file extensions
    sourceExts: [
      'jsx',
      'js',
      'ts',
      'tsx',
      'json',
      'mjs'
    ],
    // Supported asset extensions
    assetExts: [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'ttf',
      'otf',
      'woff',
      'woff2'
    ],
    // Supported platforms
    platforms: ['android', 'ios'],
    // Exclude specific modules from bundling
    blacklistRE: getBlacklistRE([
      /node_modules[/\\]react[/\\]dist[/\\].*/,
      /node_modules[/\\]core-js[/\\].*/
    ]),
  },

  /**
   * Watched folders for changes during development
   */
  watchFolders: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, 'src/shared'),
  ],

  /**
   * Maximum number of worker threads for bundling
   */
  maxWorkers: 4,

  /**
   * Cache configuration for improved build performance
   */
  resetCache: false,
  cacheStores: [{
    name: 'metro',
    type: 'FileStore',
    maxSize: 102400000, // 100MB cache size
  }],

  /**
   * Reporter configuration for development feedback
   */
  reporter: {
    useSourceMaps: true,
    reporterConfig: {
      maximumNumberOfFiles: 1000,
      maximumNumberOfLogLines: 200,
    },
  },

  /**
   * Project root configuration
   */
  projectRoot: path.resolve(__dirname),
};