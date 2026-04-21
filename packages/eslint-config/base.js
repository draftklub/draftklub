import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

/**
 * Base ESLint config compartilhada pelo monorepo DraftKlub.
 * Enforca fronteiras entre modulos via eslint-plugin-boundaries.
 */
export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
      parserOptions: { projectService: true },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'module-public', pattern: 'src/modules/*/public/**' },
        { type: 'module-api', pattern: 'src/modules/*/api/**' },
        { type: 'module-application', pattern: 'src/modules/*/application/**' },
        { type: 'module-domain', pattern: 'src/modules/*/domain/**' },
        { type: 'module-infrastructure', pattern: 'src/modules/*/infrastructure/**' },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'bootstrap', pattern: 'src/bootstrap/**' },
      ],
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'module-public', allow: ['module-application', 'shared'] },
            { from: 'module-api', allow: ['module-application', 'module-public', 'shared'] },
            {
              from: 'module-application',
              allow: ['module-domain', 'module-infrastructure', 'module-public', 'shared'],
            },
            { from: 'module-infrastructure', allow: ['module-domain', 'shared'] },
            { from: 'module-domain', allow: ['module-domain', 'shared'] },
            { from: 'shared', allow: ['shared'] },
            {
              from: 'bootstrap',
              allow: [
                'module-public',
                'module-api',
                'module-application',
                'module-infrastructure',
                'shared',
              ],
            },
          ],
        },
      ],
    },
  },
  prettier,
);
