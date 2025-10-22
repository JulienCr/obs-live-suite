import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
  webpack: (config, { isServer, dev }) => {
    // Handle better-sqlite3 native module
    if (isServer) {
      config.externals.push('better-sqlite3');
      // Prevent webpack from trying to bundle filesystem scanning code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
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
