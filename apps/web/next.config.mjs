/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone gera node_modules minificado em .next/standalone — usado
  // pelo Dockerfile multi-stage pra reduzir imagem de ~800MB pra ~150MB.
  output: 'standalone',
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
