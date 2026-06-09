// next.config.js
module.exports = {
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
