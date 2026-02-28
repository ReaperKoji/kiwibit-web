import js from '@eslint/js'
import globals from 'globals'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['.next', 'node_modules', 'next-env.d.ts', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
