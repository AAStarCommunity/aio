/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.test\.(ts|tsx|js|jsx)$/,
      loader: 'ignore-loader'
    });
    return config;
  }
}

module.exports = nextConfig 