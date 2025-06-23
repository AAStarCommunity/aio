/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 设置开发服务器端口为 8080
  async rewrites() {
    return [];
  },
  // 设置服务器端口
  serverOptions: {
    port: 8080
  }
}

module.exports = nextConfig 