import nextConfig from '@draftklub/eslint-config/nextjs';

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
