/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/transactions', destination: '/finance/transactions', permanent: true },
      { source: '/reconciliation', destination: '/finance/reconciliation', permanent: true },
      { source: '/accounts', destination: '/finance/accounts', permanent: true },
      { source: '/investments', destination: '/finance/investments', permanent: true },
      { source: '/budget', destination: '/finance/budget', permanent: true },
      { source: '/analysis', destination: '/finance/analysis', permanent: true },
      { source: '/analytics', destination: '/finance/analysis', permanent: true },
      { source: '/finance/analytics', destination: '/finance/analysis', permanent: true },
    ];
  },
};

module.exports = nextConfig;
