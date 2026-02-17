import { fileURLToPath } from 'url';
import { dirname } from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow LAN access during development (use specific IPs or wildcards)
  allowedDevOrigins: [
    'http://192.168.1.10:3000',
    'https://192.168.1.10:3000',
    'http://edison:3000',
    'https://edison:3000',
    'http://edison',
    'https://edison',
    'http://localhost:3000',
    'https://localhost:3000',
  ],
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: 'localhost' }],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['better-sqlite3', 'obs-websocket-js', 'ws'],
  outputFileTracingRoot: __dirname,
  outputFileTracingExcludes: {
    '*': ['**/Application Data/**', '**/AppData/**']
  },
};

export default withNextIntl(nextConfig);
