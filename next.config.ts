import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  compress: true,
  outputFileTracingRoot: path.resolve(__dirname),
  webpack: (config) => {
    config.ignoreWarnings = config.ignoreWarnings ?? []
    config.ignoreWarnings.push({
      module: /@opentelemetry\/instrumentation/,
      message: /Critical dependency: the request of a dependency is an expression/,
    })
    return config
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
