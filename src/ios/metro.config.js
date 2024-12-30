// @ts-check
const { getDefaultConfig } = require('metro-config');

/**
 * Metro configuration for React Native iOS
 * https://facebook.github.io/metro/docs/configuration
 * 
 * @type {import('metro-config').MetroConfig}
 */
module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts }
  } = await getDefaultConfig();

  return {
    transformer: {
      // Enable inline requires for performance optimization
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
      // Use React Native Babel preset for code transformation
      babelTransformerPath: require.resolve('metro-react-native-babel-preset'),
    },

    resolver: {
      // Configure source file extensions for JavaScript/TypeScript
      sourceExts: [
        ...sourceExts,
        'js',
        'jsx',
        'ts',
        'tsx',
        'json'
      ],
      // Configure asset extensions for images and fonts
      assetExts: [
        ...assetExts,
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp',
        'ttf',
        'otf'
      ],
    },

    // Cache configuration for improved build performance
    cacheVersion: '1.0',
    cacheStores: [
      {
        type: 'FileStore',
        location: '.metro-cache'
      }
    ],

    // Performance optimizations
    maxWorkers: 8,
    resetCache: false,

    // Default reporter configuration
    reporter: {
      type: 'default'
    },

    // Watch configuration
    watchFolders: [
      // Include project root
      __dirname,
      // Include workspace root for monorepo support
      process.cwd(),
    ],

    // Project configuration
    projectRoot: __dirname,
  };
})();