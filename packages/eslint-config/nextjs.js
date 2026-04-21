import base from './base.js';

export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },
];
