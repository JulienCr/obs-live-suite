import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow LAN access during development (use specific IPs or wildcards)
  allowedDevOrigins: [
    'http://192.168.1.10:3000',  // Votre IP spécifique
    // Ajoutez d'autres IPs au besoin
  ],
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['better-sqlite3', 'obs-websocket-js', 'ws'],
  outputFileTracingRoot: __dirname,
  outputFileTracingExcludes: {
    '*': ['**/Application Data/**', '**/AppData/**']
  },
  turbopack: {
    // Configure module resolution aliases
    resolveAlias: {
      // Turbopack will respect path mappings from tsconfig.json automatically
      // Add custom aliases here if needed
    },
    // Configure custom file extensions for resolution
    resolveExtensions: [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json',
    ],
    // Configure webpack loaders (if needed in the future)
    rules: {
      // Example: '*.svg': {
      //   loaders: ['@svgr/webpack'],
      //   as: '*.js',
      // },
    },
  },
  webpack: (config, { isServer, dev, webpack }) => {
    // Handle better-sqlite3 native module
    if (isServer) {
      config.externals.push('better-sqlite3');
      // Prevent webpack from trying to bundle filesystem scanning code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    } else {
      // Client-side: Add crypto polyfill for @streamerbot/client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: 'crypto-browserify',
        stream: 'stream-browserify',
        buffer: 'buffer',
      };

      // Provide Buffer and process globals for browser
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }

    // Suppress EPERM errors during build on Windows
    const originalEmit = config.infrastructureLogging?.level ? config.infrastructureLogging : {};
    config.infrastructureLogging = {
      ...originalEmit,
      level: 'error',
    };

    return config;
  },
};

export default nextConfig;
