/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        cookie: false,
      }
    }
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/electron-app/**'],
    }
    return config
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./electron-app/**/*'],
    },
  },
}

module.exports = nextConfig

