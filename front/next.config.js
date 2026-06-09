// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.stenaskartinami.com'],
  },
  eslint: {
    ignoreDuringBuilds: true,
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
