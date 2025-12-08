import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize performance
  compress: true,
  poweredByHeader: false,
  
  // Production optimizations
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize images if used
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: false,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ],
      },
    ];
  },
  
  // Output configuration
  // For Netlify, Next.js handles this automatically via @netlify/plugin-nextjs
  // output: 'standalone', // Only needed for self-hosted deployments
};

export default nextConfig;
