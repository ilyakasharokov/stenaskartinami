// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

// Internal Strapi base (Docker DNS) for proxying /uploads same-origin,
// so the next/image optimizer can always reach the files.
const STRAPI_INTERNAL_BASE = (process.env.STRAPI_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337/api')
  .replace(/\/api\/?$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days — uploads are immutable (hashed filenames)
    remotePatterns: [
      { protocol: 'https', hostname: 'api.stenaskartinami.com' },
      { protocol: 'http', hostname: 'localhost', port: '1337' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${STRAPI_INTERNAL_BASE}/uploads/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      // Legacy lead-form page superseded by the /account/add-art wizard
      { source: '/add-art', destination: '/account/add-art', permanent: true },
      // With OTP auth, sign-up and sign-in are the same flow
      { source: '/auth/signup', destination: '/auth/signin', permanent: true },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is done separately with tsc --noEmit before this build step
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    'react-instantsearch',
    'react-instantsearch-core',
  ],
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: { treeshake: { removeDebugLogging: true } },
});
