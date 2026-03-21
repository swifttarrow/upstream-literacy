/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Use 127.0.0.1 instead of localhost to avoid IPv6 (::1) connection refused on macOS
        // Backend routes use /api prefix, so forward to /api/:path*
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
